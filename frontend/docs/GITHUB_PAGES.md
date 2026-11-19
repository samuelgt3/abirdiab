# Hosting on GitHub Pages

The website is a static app, so GitHub Pages can host it for free. The workflow `.github/workflows/deploy.yml` builds and publishes
it every time the `main` branch changes.

## One-time setup (about 5 minutes)
1. **Repository > Settings > Pages > Build and deployment > Source: GitHub Actions.**
2. **Repository > Settings > Secrets and variables > Actions > Variables** — add:
   - `VITE_SUPABASE_URL` = `https://tiahqrrchxvhffynlvrl.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the public anon key (Supabase > Project Settings > API). It is public by design. **Never** add the service_role key anywhere.
   - optional `VITE_SITE_URL` / `VITE_BASE` if you use your own domain (otherwise they are worked out from the repository name).
3. **Supabase > Authentication > URL Configuration**: set *Site URL* to the published address (e.g. `https://<owner>.github.io/<repo>`) and add it to *Redirect URLs* (sign-in emails and Google sign-in return there).
4. **Supabase > Edge Functions > Secrets**: set `SITE_URLS` to the published address (used for the payment return page) and `SITE_URL` for email links.
5. Push to `main` (or run the workflow from the **Actions** tab). The address appears in the workflow summary.

## Notes
- Unknown addresses get a real 404: the build copies `index.html` to `404.html`, which GitHub Pages serves for any address that is not a file; the site then shows its "page not found" screen.
- `/admin` is part of the same site (hidden from search engines, protected by login).
- Using your own domain: Settings > Pages > Custom domain, then set the `VITE_SITE_URL` variable to `https://your-domain` and `VITE_BASE` to `/`.
- Pages serves only public files. Keep secrets (Paymob, Resend, Twilio keys) in **Supabase secrets**, never in the repository.
