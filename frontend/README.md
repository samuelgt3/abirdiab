> **Backend developer: read [BACKEND_HANDOFF.md](BACKEND_HANDOFF.md) first.** This copy contains the website and admin only; the backend is for you to build.

# Abir Diab â€” Website & Content Admin

Bilingual (English / Arabic, right-to-left) marketing and shop site for **Abir Diab**, an energy-healing
practitioner, plus a private admin page where the client edits her own content.

| Part | Technology |
| --- | --- |
| Public site + admin | React 18, React Router, Tailwind CSS 3, built with Vite |
| Database, login, file storage | Supabase (PostgreSQL + Auth + Storage) |
| Hosting | Static files (cPanel / any static host). No server of our own to run |

```
visitor â”€â”€â–¶ static site (React) â”€â”€â–¶ Supabase REST (read published rows only)
admin   â”€â”€â–¶ /admin (React)      â”€â”€â–¶ Supabase Auth login â”€â”€â–¶ read/write rows + upload files
```

## Quick start

Requires **Node 18+** (tested on Node 24).

```bash
npm install
cp .env.example .env.local     # then paste the anon key (see docs/SETUP.md)
npm run dev                    # http://localhost:5173  (admin: /admin)
```

The site also runs **without** any `.env` â€” it then shows the bundled starter content, so a fresh clone is never blank.

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Production build into `dist/` (upload this folder) |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm test` | Unit tests (pricing, admin form logic) |
| `npm run check` | lint + test + build â€” run before every commit |

## What is in the repo

```
src/
  components/      public site sections (Hero, Courses, Workshops, â€¦)
  pages/           Home, policy pages
  admin/           the admin app (code-split, loaded only at /admin)
  hooks/           SiteContext: language, content, currency
  lib/             supabase client, pricing, content loading, links
  content/         EN / AR interface text (JSON), policies
  data/            fallback.json â€” bundled starter content (same shape as the DB)
public/            images, .htaccess (SPA routing for cPanel), robots.txt
supabase/
  migrations/      0001 schema Â· 0002 course packs Â· 0003 admin allow-list (optional) Â· 0004 newsletter Â· 0005 advisor fix
  seed.sql         starter content for a fresh database
docs/              all documentation (start at docs/README.md)
legacy/            the original exports this project was built from (reference only)
```

## Documentation

Everything is indexed in **[docs/README.md](docs/README.md)**. The most useful starting points:

- New developer â†’ [docs/SETUP.md](docs/SETUP.md), then [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- The client / non-developer â†’ [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)
- Going live â†’ [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and the launch checklist in [docs/SECURITY.md](docs/SECURITY.md)
- What is *not* built yet (payments, booking, student login) â†’ [docs/ROADMAP.md](docs/ROADMAP.md)
- Picking up where the last session stopped â†’ [HANDOFF.md](HANDOFF.md)

## Status

Public site, admin, database, country-based pricing and docs are done and build cleanly.
Payments, online booking, student accounts and paid video delivery are **not** built â€” the site sends
visitors to WhatsApp for those. See the roadmap.

## Licence

Proprietary â€” Â© Abir Diab. All rights reserved. The bundled fonts are open source (SIL OFL) and keep their own licences.

