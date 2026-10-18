# MedianMatch

Match your SAT/ACT, GPA, activities and family income with 930+ U.S. colleges (including test-free UC and CSU campuses), see an estimated
admission chance (as a range) and what each college would cost your family after grants.

What students can do:

- **Discover**: Reach / Match / Safety colleges with a short "why it fits" on each card, plus QuestBridge partner tags and a filter.
- **What if?**: move SAT/ACT, GPA, test-optional, activities or major and watch the whole list shift before changing the profile.
- **My List**: per-college status, round, deadline and checklist; essay and financial-aid steps (FAFSA, CSS Profile, QuestBridge); "Next up" reminders; compare 2–4 colleges.
- **Report**: strengths, gaps and next steps for academics, activities, essays, financial aid and list balance (no overall score).

The QuestBridge partner list is hard-coded in `index.html` (`const QB`) from questbridge.org/partners/college-partners (checked October 2026). Check it each fall.

## Folders

| Folder | What it is |
|---|---|
| `public/` | The website. `index.html` is the whole app (English and Spanish); everything about the student is calculated in the browser. Also: `sw.js` (offline support), `manifest.webmanifest` + icons (install to home screen), `og-image.png` (link preview), `robots.txt`, `sitemap.xml`. |
| `api/` | Small Node server: receives anonymous usage events and serves the password-protected stats dashboard at `/admin`. |

## Settings in Render

**Website (Static Site)**: Publish Directory `public`, Build Command empty.

**API (Web Service, free)**: Root Directory `api`, Build Command `npm install --omit=dev`, Start Command `node server.js`.
Environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon connection string (`postgresql://...`). Keep it secret. |
| `ADMIN_PASSWORD` | Dashboard password, 12+ characters. Keep it secret. |
| `ALLOWED_ORIGINS` | Your website address, e.g. `https://medianmatch.onrender.com` (no slash at the end). |

If you move the site to a custom domain, update the `medianmatch.onrender.com` links in `index.html` (canonical and og tags), `robots.txt` and `sitemap.xml`.

If your API address is not `https://medianmatch-stats.onrender.com`, update `API_URL` near the top of the
script in `public/index.html` **and** the `connect-src` address in the Content-Security-Policy line at the top.

## Privacy

Scores, GPA, income and activities are never sent anywhere. The API stores only event type, a short label
(college name, link, filter or search words), device type and a daily-rotating anonymous visitor code.
No IP addresses, no cookies. Events older than 13 months are deleted automatically.
