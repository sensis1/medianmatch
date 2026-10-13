// Sends test "visit" events to the MedianMatch stats API to confirm the backend records them.
// Usage:  node scripts/ping-visits.mjs [count] [apiUrl] [origin]
// Defaults: 1000 visits, https://medianmatch-stats.onrender.com, https://medianmatch.onrender.com
//
// Every test visit is labeled "loadtest" (shows up under "Where visitors came from"),
// so you can remove them later in Neon with:
//   DELETE FROM events WHERE type='visit' AND label='loadtest';

const TOTAL  = Number(process.argv[2] || 1000);
const API    = (process.argv[3] || "https://medianmatch-stats.onrender.com").replace(/\/$/, "");
const ORIGIN = (process.argv[4] || "https://medianmatch.onrender.com").replace(/\/$/, "");
const UA     = "Mozilla/5.0 (Macintosh) MedianMatch-LoadTest/1.0"; // must NOT contain bot/crawl/headless or the server drops it
const BATCH  = 10; // server accepts up to 10 events per request

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function wakeUp() {
  // Render free services sleep; the first request can take ~50s.
  process.stdout.write("Waking API");
  for (let i = 0; i < 20; i++) {
    try { const r = await fetch(API + "/health"); if (r.ok) { console.log(" ✓"); return; } } catch {}
    process.stdout.write("."); await sleep(5000);
  }
  throw new Error("API did not respond at " + API + "/health");
}

async function send(n) {
  const body = JSON.stringify(Array.from({ length: n }, () => ({ t: "visit", l: "loadtest" })));
  for (let attempt = 0; attempt < 10; attempt++) {
    const r = await fetch(API + "/e", {
      method: "POST",
      headers: { "Content-Type": "text/plain", "Origin": ORIGIN, "User-Agent": UA },
      body,
    });
    if (r.status === 204) return;
    if (r.status === 429) { await sleep(1100); continue; }            // rate limit: wait and retry
    const text = await r.text().catch(() => "");
    if (r.status === 403) throw new Error(`403 origin not allowed. ALLOWED_ORIGINS on Render doesn't include ${ORIGIN}. Fix that env var (this may be why real visits aren't counting).`);
    throw new Error(`HTTP ${r.status}: ${text}`);
  }
  throw new Error("Kept getting rate-limited");
}

await wakeUp();
let sent = 0; const t0 = Date.now();
while (sent < TOTAL) {
  const n = Math.min(BATCH, TOTAL - sent);
  await send(n);
  sent += n;
  process.stdout.write(`\rSent ${sent}/${TOTAL} visits`);
}
console.log(`\nDone: ${sent} visits accepted (HTTP 204) in ${((Date.now() - t0) / 1000).toFixed(0)}s.`);
console.log("Check the dashboard at " + API + "/admin. Visits should go up by " + sent + " and \"loadtest\" should appear under referrers.");
