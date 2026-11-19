# Hosting on Cloudflare Pages (recommended; works with a private GitHub repository)

The site is a static app: Cloudflare builds it from the GitHub repository and serves it for free, rebuilding every time `main` changes.
The build (`npm run build`) also writes a copy of `index.html` for every real page and a `404.html`, so real pages answer "OK" and
unknown addresses answer a true 404 that shows the site's "page not found" screen.

## One-time setup (about 10 minutes)
1. Create a free account at **dash.cloudflare.com**.
2. **Workers & Pages → Create → Pages → Connect to Git.** Authorise GitHub and choose the repository (private is fine).
   (Cloudflare's menus change from time to time; look for "Pages" and "Connect to Git".)
3. Build settings: **Build command** `npm run build` · **Build output directory** `dist` · Framework preset "None" (or Vite).
4. **Environment variables (Production):**
   - `VITE_SUPABASE_URL` = `https://tiahqrrchxvhffynlvrl.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the public anon key (the same value as in your local `.env.local`). Never the service_role key.
   - `NODE_VERSION` = `20`
5. **Save and Deploy.** You get an address like `https://abir-diab-site.pages.dev`.
6. Add one more variable `VITE_SITE_URL` = that address (no trailing slash), then **redeploy** (Deployments → Retry). It is used for the sitemap, share image and canonical links.
7. **Supabase → Authentication → URL Configuration:** set *Site URL* to the address and add it to *Redirect URLs*.
   **Supabase → Edge Functions → Secrets:** `SITE_URLS` = the address (payment return page) and `SITE_URL` = the address (email links).

## Later: your own domain
Cloudflare Pages → your project → **Custom domains → Set up a domain**. Then change `VITE_SITE_URL` to `https://your-domain`, redeploy, and update the two Supabase places above.

## Notes
- New courses or journal posts added in the admin work immediately; they get their own sitemap entry at the next rebuild (Deployments → Retry).
- Secrets (Paymob, Resend, Twilio keys) live in **Supabase secrets**, never in Cloudflare or the repository.
- The older GitHub Pages workflow (`.github/workflows/deploy.yml`) is kept but only runs by hand; see `docs/GITHUB_PAGES.md` if you ever use it.
