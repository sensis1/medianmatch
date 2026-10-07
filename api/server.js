"use strict";
/*
 * MedianMatch API
 * - POST /e            anonymous usage events from the website (no scores, GPA, income or activities)
 * - GET  /admin        password-protected stats dashboard
 * - POST /admin/stats  dashboard data (needs ADMIN_PASSWORD)
 * - GET  /health       uptime check
 *
 * Environment variables (set in Render, never in code):
 *   DATABASE_URL     Neon connection string (postgresql://...)
 *   ADMIN_PASSWORD   password for the dashboard (12+ characters)
 *   ALLOWED_ORIGINS  comma-separated site origins, e.g. https://medianmatch.onrender.com
 */
const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT) || 10000;
const DATABASE_URL = process.env.DATABASE_URL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim().replace(/\/$/, "")).filter(Boolean)
);
const RETENTION_DAYS = 395; // about 13 months

if (!DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }
if (ADMIN_PASSWORD.length < 12) console.warn("ADMIN_PASSWORD is missing or shorter than 12 characters; the dashboard is disabled until it is set.");
if (!ALLOWED_ORIGINS.size) console.warn("ALLOWED_ORIGINS is empty; events from browsers will be rejected.");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: true },
  max: 5,
  idleTimeoutMillis: 30000,
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id      BIGSERIAL PRIMARY KEY,
      ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
      type    TEXT NOT NULL,
      label   TEXT,
      visitor TEXT,
      device  TEXT
    );
    CREATE INDEX IF NOT EXISTS events_ts_idx ON events (ts);
    CREATE INDEX IF NOT EXISTS events_type_ts_idx ON events (type, ts);
  `);
}
async function prune() {
  try { await pool.query(`DELETE FROM events WHERE ts < now() - ($1 || ' days')::interval`, [String(RETENTION_DAYS)]); }
  catch (e) { console.error("prune failed:", e.message); }
}

// ---------- helpers ----------
const EVENT_TYPES = new Set(["visit", "open_college", "link_click", "group", "sort", "search", "tab", "chance_view"]);

// Daily-rotating secret salt: visitor IDs can't be linked across days or reversed to an IP.
let salt = { day: "", value: "" };
function dailySalt() {
  const day = new Date().toISOString().slice(0, 10);
  if (salt.day !== day) salt = { day, value: crypto.randomBytes(32).toString("hex") };
  return salt.value;
}
function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.socket.remoteAddress || "";
}
function visitorId(req) {
  return crypto.createHash("sha256").update(dailySalt() + "|" + clientIp(req) + "|" + (req.headers["user-agent"] || "")).digest("hex").slice(0, 16);
}
function deviceOf(req) {
  const ua = String(req.headers["user-agent"] || "");
  if (/bot|crawl|spider|slurp|preview|headless/i.test(ua)) return "bot";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}
function cleanLabel(v) {
  if (v == null) return null;
  // printable text only, trimmed and capped
  return String(v).replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 100) || null;
}
function securityHeaders(res, extra = {}) {
  const h = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Resource-Policy": "same-site",
    "Cache-Control": "no-store",
    ...extra,
  };
  for (const [k, v] of Object.entries(h)) res.setHeader(k, v);
}
function send(res, status, body, type = "application/json; charset=utf-8") {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > limit) { reject(Object.assign(new Error("too large"), { status: 413 })); req.resume(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Simple in-memory rate limiter (token bucket per key)
function limiter(capacity, refillPerSec) {
  const buckets = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.t > 600000) buckets.delete(k); }, 60000).unref();
  return key => {
    const now = Date.now(); let b = buckets.get(key);
    if (!b) { b = { tokens: capacity, t: now }; buckets.set(key, b); }
    b.tokens = Math.min(capacity, b.tokens + ((now - b.t) / 1000) * refillPerSec); b.t = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1; return true;
  };
}
const eventLimit = limiter(60, 1);          // 60 burst, 1/sec sustained per visitor
const loginLimit = limiter(8, 8 / 900);     // 8 tries per 15 minutes per IP

function passwordOk(given) {
  if (ADMIN_PASSWORD.length < 12 || typeof given !== "string") return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------- handlers ----------
async function handleEvent(req, res) {
  const origin = String(req.headers.origin || "").replace(/\/$/, "");
  if (!ALLOWED_ORIGINS.has(origin)) return send(res, 403, { error: "origin not allowed" });
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  if (deviceOf(req) === "bot") { res.statusCode = 204; return res.end(); }
  const vid = visitorId(req);
  if (!eventLimit(vid)) return send(res, 429, { error: "slow down" });
  let data;
  try { data = JSON.parse(await readBody(req, 2048)); } catch (e) { return send(res, e.status || 400, { error: "bad request" }); }
  const list = Array.isArray(data) ? data.slice(0, 10) : [data];
  const rows = [];
  for (const ev of list) {
    if (!ev || typeof ev !== "object" || !EVENT_TYPES.has(ev.t)) continue;
    rows.push([ev.t, cleanLabel(ev.l)]);
  }
  if (!rows.length) return send(res, 400, { error: "no valid events" });
  const params = []; const values = [];
  rows.forEach(([t, l], i) => { values.push(`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`); params.push(t, l, vid, deviceOf(req)); });
  await pool.query(`INSERT INTO events (type, label, visitor, device) VALUES ${values.join(",")}`, params);
  res.statusCode = 204; res.end();
}

async function handleStats(req, res) {
  const ip = clientIp(req);
  if (!loginLimit(ip)) return send(res, 429, { error: "Too many attempts. Wait 15 minutes." });
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ") || !passwordOk(auth.slice(7))) return send(res, 401, { error: "Wrong password." });
  let body = {};
  try { body = JSON.parse((await readBody(req, 512)) || "{}"); } catch { /* default range */ }
  const days = [7, 30, 90, 365].includes(Number(body.days)) ? Number(body.days) : 30;
  const since = `now() - interval '${days} days'`; // days is from a fixed allowlist above

  const q = (sql, p = []) => pool.query(sql, p).then(r => r.rows);
  const [totals, byDay, colleges, links, searches, groups, devices, referrers] = await Promise.all([
    q(`SELECT
         count(*) FILTER (WHERE type='visit')::int AS visits,
         count(DISTINCT (visitor, date_trunc('day', ts))) FILTER (WHERE type='visit')::int AS visitors,
         count(*) FILTER (WHERE type='open_college')::int AS college_opens,
         count(*) FILTER (WHERE type='link_click')::int AS link_clicks,
         count(*) FILTER (WHERE type='search')::int AS searches
       FROM events WHERE ts >= ${since}`),
    q(`SELECT to_char(d, 'YYYY-MM-DD') AS day,
              coalesce(count(e.*) FILTER (WHERE e.type='visit'),0)::int AS visits,
              coalesce(count(DISTINCT e.visitor) FILTER (WHERE e.type='visit'),0)::int AS visitors
       FROM generate_series(date_trunc('day', ${since}), date_trunc('day', now()), interval '1 day') d
       LEFT JOIN events e ON date_trunc('day', e.ts) = d
       GROUP BY d ORDER BY d`),
    q(`SELECT label, count(*)::int AS n FROM events WHERE type='open_college' AND ts >= ${since} AND label IS NOT NULL GROUP BY label ORDER BY n DESC LIMIT 15`),
    q(`SELECT label, count(*)::int AS n FROM events WHERE type='link_click' AND ts >= ${since} AND label IS NOT NULL GROUP BY label ORDER BY n DESC LIMIT 15`),
    q(`SELECT lower(label) AS label, count(*)::int AS n FROM events WHERE type='search' AND ts >= ${since} AND label IS NOT NULL GROUP BY lower(label) ORDER BY n DESC LIMIT 15`),
    q(`SELECT label, count(*)::int AS n FROM events WHERE type IN ('group','sort','tab') AND ts >= ${since} AND label IS NOT NULL GROUP BY label ORDER BY n DESC LIMIT 15`),
    q(`SELECT device AS label, count(*)::int AS n FROM events WHERE type='visit' AND ts >= ${since} GROUP BY device ORDER BY n DESC`),
    q(`SELECT coalesce(label,'direct') AS label, count(*)::int AS n FROM events WHERE type='visit' AND ts >= ${since} GROUP BY 1 ORDER BY n DESC LIMIT 10`),
  ]);
  send(res, 200, { days, totals: totals[0], byDay, colleges, links, searches, groups, devices, referrers });
}

const DASHBOARD = fs.readFileSync(path.join(__dirname, "dashboard.html"), "utf8");
function handleDashboard(req, res) {
  const nonce = crypto.randomBytes(16).toString("base64");
  securityHeaders(res, {
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
    "X-Robots-Tag": "noindex, nofollow",
  });
  send(res, 200, DASHBOARD.replace(/__NONCE__/g, nonce), "text/html; charset=utf-8");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (req.method === "POST" && url.pathname === "/e") { securityHeaders(res); return await handleEvent(req, res); }
    if (req.method === "OPTIONS" && url.pathname === "/e") {
      const origin = String(req.headers.origin || "").replace(/\/$/, "");
      securityHeaders(res);
      if (ALLOWED_ORIGINS.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "POST");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Access-Control-Max-Age", "86400");
        res.setHeader("Vary", "Origin");
      }
      res.statusCode = 204; return res.end();
    }
    if (req.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/")) return handleDashboard(req, res);
    if (req.method === "POST" && url.pathname === "/admin/stats") { securityHeaders(res, { "X-Robots-Tag": "noindex" }); return await handleStats(req, res); }
    if (req.method === "GET" && url.pathname === "/health") { securityHeaders(res); return send(res, 200, { ok: true }); }
    if (req.method === "GET" && url.pathname === "/robots.txt") { securityHeaders(res); return send(res, 200, "User-agent: *\nDisallow: /\n", "text/plain"); }
    securityHeaders(res); send(res, 404, { error: "not found" });
  } catch (e) {
    console.error(req.method, url.pathname, e.message);
    if (!res.headersSent) send(res, e.status || 500, { error: "server error" });
  }
});
server.requestTimeout = 10000;
server.headersTimeout = 8000;

migrate()
  .then(() => { prune(); setInterval(prune, 24 * 3600 * 1000).unref(); server.listen(PORT, () => console.log(`MedianMatch API listening on ${PORT}`)); })
  .catch(e => { console.error("Database setup failed:", e.message); process.exit(1); });
