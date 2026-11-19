# Setup

## 1. Prerequisites
- **Node.js 18 or newer** (`node -v`). Download from nodejs.org if missing.
- A code editor (VS Code is fine).
- Access to the Supabase project `abir-diab-site` (only needed to edit data or run migrations).

> Tip: if the folder is inside OneDrive/Dropbox, `node_modules` will sync thousands of files. Keep the project outside synced folders, or exclude `node_modules`.

## 2. Install and run
```bash
npm install
```
Create `.env.local` in the project root (copy `.env.example`):

```
VITE_SUPABASE_URL=https://tiahqrrchxvhffynlvrl.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / public key>
```

Where to find the key: Supabase dashboard → project `abir-diab-site` → **Project Settings → API Keys** → copy the
**anon / publishable** key. It is *meant* to be public. **Never** paste the `service_role` / secret key anywhere in this project.

```bash
npm run dev
```
Open http://localhost:5173 (site) and http://localhost:5173/admin (admin).

### Without a `.env`
The site still works — it shows the bundled starter content (`src/data/fallback.json`). The admin shows "not connected yet".
In development a small badge tells you when the fallback is in use.

## 3. All environment variables
| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | for live data | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | for live data | Public anon key |
| `VITE_BASE` | no | Sub-folder deploys (e.g. `/abir/`). Default `/` |
| `VITE_WHATSAPP` | no | WhatsApp number, digits only. Default `201080736170` |
| `VITE_CONTACT_EMAIL` | no | Default `hello@abirdiab.com` |
| `VITE_BUNNY_LIBRARY_ID` | no | Enables free-video embeds (see [VIDEOS.md](VIDEOS.md)) |

`VITE_*` values are baked into the built JavaScript and visible to everyone. Never put a secret in one.

## 4. Using a brand-new Supabase project (instead of the existing one)
1. Create the project at supabase.com.
2. SQL editor → run `supabase/migrations/0001_init.sql`, then `0002_course_packs.sql`.
3. Optional: run `supabase/seed.sql` (once, on the empty database) for the starter content.
4. Authentication → **Users → Add user** (email + password) for each admin.
5. Authentication → **Sign In / Providers** → turn **Allow new users to sign up** OFF.
6. Optional hardening: edit the email at the bottom of `0003_admin_allowlist.sql`, then run it.
7. Put the new URL + anon key in `.env.local`.

If you use the Supabase CLI instead: `supabase link --project-ref <ref>` then `supabase db push`.

## 5. Troubleshooting
| Symptom | Likely cause / fix |
| --- | --- |
| Site shows content but admin says "not connected" | `.env.local` missing or key still says `paste-…`; restart `npm run dev` after editing it |
| "Could not log in: Invalid login credentials" | Wrong password, or the user does not exist in Supabase → Authentication → Users |
| Admin list is empty / "permission denied" | Not logged in, or migration 0003 is applied and your email is not in `public.admins` |
| Prices stay in USD | Country not mapped, API blocked, or you chose USD in the header (choice is remembered in the browser) |
| Pack-contents fields missing in admin | Migration 0002 not applied yet ([DATABASE.md](DATABASE.md)) |
| Refreshing `/admin` gives 404 on the host | Server not rewriting to `index.html` — see `.htaccess` in [DEPLOYMENT.md](DEPLOYMENT.md) |
