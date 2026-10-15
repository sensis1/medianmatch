# Graph Report - medianmatch  (2026-10-14)

## Corpus Check
- Corpus is ~25,469 words - fits in a single context window. You may not need a graph.

## Summary
- 126 nodes · 155 edges · 15 communities (11 shown, 4 thin omitted)
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.88)
- Token cost: 103,334 input · 0 output

## Community Hubs (Navigation)
- Stats API Server Core
- Admission Chance Model
- Anonymous Event Tracking
- Render Deployment & Security
- API Package Manifest
- Event Ingest & Visitor IDs
- Social Card Messaging
- Visit Ping Script (Node)
- Admin Dashboard UI
- App Icon Set
- Admin Stats Auth
- HTTP Response & Headers
- Visit Ping Script (Shell)
- Service Worker Cache
- Dedup Test Script

## God Nodes (most connected - your core abstractions)
1. `handleEvent()` - 10 edges
2. `handleStats()` - 8 edges
3. `evaluate()` - 8 edges
4. `server` - 6 edges
5. `medianmatch-stats Node API service` - 6 edges
6. `load()` - 6 edges
7. `send()` - 5 edges
8. `MedianMatch Brand Mark (white serif 'M' on royal blue with light-blue median underline bar)` - 5 edges
9. `clientIp()` - 4 edges
10. `visitorId()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `medianmatch-stats Node API service` --references--> `MedianMatch Stats dashboard (/admin)`  [INFERRED]
  render.yaml → api/dashboard.html
- `Privacy: client-side only computation` --rationale_for--> `saveProfile()`  [INFERRED]
  README.md → public/index.html
- `Privacy: client-side only computation` --rationale_for--> `track() anonymous event queue`  [INFERRED]
  README.md → public/index.html
- `ADMIN_PASSWORD` --conceptually_related_to--> `Bearer password auth`  [INFERRED]
  README.md → api/dashboard.html
- `ALLOWED_ORIGINS` --conceptually_related_to--> `POST /e events endpoint`  [INFERRED]
  README.md → public/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Anonymous usage stats pipeline** — public_index_track, public_index_flush, public_index_events_endpoint, render_medianmatch_stats, api_dashboard_load, api_dashboard_admin_stats_endpoint [INFERRED 0.85]
- **Admission chance and net cost evaluation** — public_index_evaluate, public_index_chanceof, public_index_labelof, public_index_estgpa, public_index_bracket, public_index_ecscore [EXTRACTED 1.00]
- **Render deployment configuration** — render_medianmatch_stats, readme_database_url, readme_admin_password, readme_allowed_origins [EXTRACTED 1.00]
- **MedianMatch App Icon Set (favicon, PWA, maskable, Apple touch)** — public_apple_touch_icon, public_favicon_32, public_icon_192, public_icon_512, public_icon_maskable_512 [INFERRED 0.95]

## Communities (15 total, 4 thin omitted)

### Community 0 - "Stats API Server Core"
Cohesion: 0.12
Nodes (9): ALLOWED_ORIGINS, crypto, DASHBOARD, EVENT_TYPES, fs, http, path, { Pool } (+1 more)

### Community 1 - "Admission Chance Model"
Cohesion: 0.16
Nodes (11): Admission chance model (Reach/Match/Safety), chanceOf(), College dataset D (930+ colleges), estGPA(), evaluate(), labelOf(), parseShare(), readProfile() (+3 more)

### Community 2 - "Anonymous Event Tracking"
Cohesion: 0.14
Nodes (12): POST /admin/stats endpoint, API_URL, Content-Security-Policy connect-src, POST /e events endpoint, flush(), saveProfile(), track() anonymous event queue, robots.txt (allow all, sitemap) (+4 more)

### Community 3 - "Render Deployment & Security"
Cohesion: 0.17
Nodes (13): Bearer password auth, MedianMatch Stats dashboard (/admin), MedianMatch single-page app (EN/ES), Service worker registration (sw.js), ADMIN_PASSWORD, DATABASE_URL (Neon Postgres), MedianMatch, Neon Postgres (+5 more)

### Community 4 - "API Package Manifest"
Cohesion: 0.15
Nodes (12): dependencies, pg, description, engines, node, main, name, private (+4 more)

### Community 5 - "Event Ingest & Visitor IDs"
Cohesion: 0.29
Nodes (8): cleanLabel(), clientIp(), dailyLimit, dailySalt(), deviceOf(), eventLimit, handleEvent(), visitorId()

### Community 6 - "Social Card Messaging"
Cohesion: 0.32
Nodes (7): Admission Chances Estimate, 900+ U.S. Colleges Dataset, Family Net Price Estimate, MedianMatch Brand (M logo, two-tone wordmark), MedianMatch Open Graph Social Card, Reach / Match / Safety Classification, Find colleges that fit you, and what they'd really cost

### Community 7 - "Visit Ping Script (Node)"
Cohesion: 0.32
Nodes (7): API, ORIGIN, send(), sleep(), t0, TOTAL, wakeUp()

### Community 9 - "App Icon Set"
Cohesion: 0.53
Nodes (6): Apple Touch Icon (180px, full-bleed blue square with serif M), Favicon 32px (blue rounded square with serif M), PWA Icon 192px (rounded blue square, serif M with underline), PWA Icon 512px (rounded blue square, serif M with underline), MedianMatch Brand Mark (white serif 'M' on royal blue with light-blue median underline bar), Maskable PWA Icon 512px (full-bleed blue, M inside safe zone)

### Community 10 - "Admin Stats Auth"
Cohesion: 0.40
Nodes (5): handleStats(), loginGlobal, loginLimit, passwordOk(), readBody()

### Community 11 - "HTTP Response & Headers"
Cohesion: 0.83
Nodes (4): handleDashboard(), securityHeaders(), send(), server

## Knowledge Gaps
- **9 isolated node(s):** `Daily-rotating anonymous visitor code`, `13-month event retention`, `Neon Postgres`, `Security headers (X-Frame-Options, HSTS, Permissions-Policy)`, `/health health check` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 54 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `track() anonymous event queue` connect `Anonymous Event Tracking` to `Admission Chance Model`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `medianmatch-stats Node API service` (e.g. with `Render hosting setup` and `MedianMatch Stats dashboard (/admin)`) actually correct?**
  _`medianmatch-stats Node API service` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Daily-rotating anonymous visitor code`, `13-month event retention`, `Neon Postgres` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Stats API Server Core` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Anonymous Event Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._