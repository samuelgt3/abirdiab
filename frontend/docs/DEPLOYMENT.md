# Deployment

The build output is plain static files. Any static host works. Hosting is **not decided yet** (likely cPanel, possibly GitHub).

## 1. Build
```bash
npm ci
npm run check          # lint + tests + build
```
Environment values are read **at build time** from `.env.local` (or CI variables). Make sure `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` are set, otherwise the live site ships with the starter content only.

Output: `dist/` — `index.html`, `assets/` (hashed JS/CSS/fonts), `images/`, `.htaccess`, `robots.txt`, `favicon.svg`.

## 2. Option A — cPanel (manual upload)
1. cPanel → **File Manager** → `public_html/` (or the domain's folder). Remove old site files first (keep a copy).
2. Upload the **contents** of `dist/` (zip it, upload, **Extract**). Include the hidden `.htaccess` (File Manager → Settings → *Show hidden files*).
3. Visit the domain, then `/admin`, then refresh on `/admin` (must not 404 — that is what `.htaccess` fixes).
4. Make sure HTTPS is on (cPanel → SSL/TLS Status → AutoSSL).

Sub-folder (e.g. `domain.com/abir/`): build with `VITE_BASE=/abir/` and update `RewriteBase`/`RewriteRule` in `.htaccess` to `/abir/`.

## 3. Option B — GitHub → cPanel / host (automatic)
`.github/workflows/ci.yml` already runs lint, tests and build on every push and pull request.
To auto-deploy add a deploy job later (cPanel Git deployment, or FTP/SFTP action with secrets) — never commit credentials; use repository **Secrets**.
Add the two `VITE_SUPABASE_*` values as repository **Variables/Secrets** and expose them to the build step.

## 4. Other hosts
Netlify / Vercel / Cloudflare Pages: build command `npm run build`, output `dist`, add the env vars, and a rewrite of `/*` → `/index.html`
(Netlify: `public/_redirects` with `/* /index.html 200`).

## 5. Supabase settings that depend on the address
- Authentication → **URL Configuration**: set *Site URL* to the real domain. Add `http://localhost:5173` as an extra redirect for development.
- CORS: the REST API accepts browser calls from any origin by default; nothing to change.

## 6. Post-deploy smoke test (5 minutes)
- [ ] Home loads, images and fonts appear, no red errors in the browser console.
- [ ] Courses, workshops, journal and testimonials show **database** content (change a title in `/admin`, refresh the site).
- [ ] Toggle Arabic → layout mirrors; refresh keeps Arabic.
- [ ] Currency switch changes prices; footer note present.
- [ ] `/admin` loads, refreshing it does not 404, login works, an edit appears on the site, upload works.
- [ ] `/admin` is excluded: `robots.txt` Disallow + `noindex` meta (already in code).
- [ ] The launch checklist in [SECURITY.md](SECURITY.md) is fully ticked.

## 7. Updating the site later
Content changes need **no deploy** (use `/admin`). Code or interface-text changes: rebuild and upload `dist/` again.
Hashed asset names mean visitors pick up changes automatically; `index.html` is served `no-cache`.

## 8. Rollback
Keep the previous `dist.zip`. To roll back, re-extract it over `public_html/`. The database is independent of deployments.
