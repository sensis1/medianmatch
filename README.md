# MedianMatch

Match your SAT/ACT, GPA, activities and family income with about 900 U.S. colleges, see an estimated
admission chance (as a range) and what each college would cost your family after grants.

## Folders

| Folder | What it is |
|---|---|
| `public/` | The website (one HTML file). Everything about the student is calculated in the browser. |
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

If your API address is not `https://medianmatch-api.onrender.com`, update `API_URL` near the top of the
script in `public/index.html` **and** the `connect-src` address in the Content-Security-Policy line at the top.

## Privacy

Scores, GPA, income and activities are never sent anywhere. The API stores only event type, a short label
(college name, link, filter or search words), device type and a daily-rotating anonymous visitor code.
No IP addresses, no cookies. Events older than 13 months are deleted automatically.
