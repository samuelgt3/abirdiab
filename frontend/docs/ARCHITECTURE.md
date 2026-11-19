# Architecture

## Overview
One single-page React app, built to static files. There is **no server of our own**: the browser talks directly to Supabase,
and Postgres row level security (RLS) decides who can read or write what.

```
                       ┌──────────────────────────── Supabase (eu-central-1) ───────────────────────────┐
 Visitor's browser     │  PostgREST API  ◀── RLS: anyone may SELECT rows where published = true         │
  React site  ─────────┼▶ testimonials · courses · workshops · journal_posts                            │
                       │                                                                                │
 Admin's browser       │  Auth (email+password) ──▶ role "authenticated" ──▶ RLS allows write           │
  React /admin ────────┼▶ Storage bucket "media" (public read, authenticated write)                     │
                       └────────────────────────────────────────────────────────────────────────────────┘
 Visitor's browser ──▶ api.country.is (country)   open.er-api.com (USD exchange rates)   — no keys
```

## Routes
| Path | Component | Notes |
| --- | --- | --- |
| `/` | `pages/Home` | One long page with anchored sections (`/#about`, `/#workshop`, …); previews of materials, journal, testimonials |
| `/materials` | `pages/MaterialsPage` | Full catalogue. Search + type chips + free chip, kept in the URL: `?type=Audio&free=1&q=…` |
| `/materials/:slug` | `pages/CoursePage` | One course/pack: sticky price bar, price card, gift card, teaser, what you get, pack contents, related |
| `/journal` | `pages/JournalPage` | All posts, topic filter `?topic=…` |
| `/journal/:slug` | `pages/JournalPostPage` | Article + "More from the journal" sidebar |
| `/testimonials` | `pages/TestimonialsPage` | Tabs `?kind=written|voice|screenshot`, service filter `?service=…`, voice player, screenshot viewer |
| `/privacy`, `/refunds` | `pages/PolicyPage` | Text from `content/policies.json` (EN + AR) |

Slugs come from the **English title** (`lib/slug.js`): renaming a course or post in the admin changes its URL. All public pages share
`components/Layout.jsx` (header, footer, grain, scroll-to-top / scroll-to-`#section`).
| `/admin` | `admin/AdminApp` | `React.lazy` — visitors never download it; sets `noindex` |

## Folder map
```
src/
  main.jsx · App.jsx            router; admin lazy-loaded; site wrapped in <SiteProvider>
  hooks/SiteContext.jsx         the one global store: lang, content, currency, price(), t (UI text)
  lib/
    supabase.js                 client (null when env vars are missing)
    content.js                  loadContent(): DB first, bundled fallback; pick(), assetUrl(), upcoming()
    pricing.js                  convert / round / format / fetch rates + country (pure + tested)
    links.js                    WhatsApp / email / social links
  components/                   Header, Hero, About, Services, Sessions, Meditations, Courses,
                                Workshops, Journal, Testimonials, Faq, Contact, Footer, Modal, Section
  admin/
    schema.js                   which tables/fields the client can edit (one config object)
    payload.js                  form values <-> database rows (pure + tested)
    AdminApp / EditDialog / FileField
  content/en.json ar.json       interface text; kinds.json; policies.json
  data/fallback.json            starter content, same shape as the DB rows
```

## Data flow (public site)
1. `SiteProvider` mounts → `loadContent()` runs four `select * … where published = true order by sort_order` queries in parallel.
2. Any failure (no env, offline, RLS error) → bundled `fallback.json`, so the page is never blank.
3. Components call `pick(row, 'title')`: the Arabic twin `title_ar` when the language is Arabic **and** it is filled in, otherwise English.
4. Upcoming workshops are computed on the client (`starts_at` in the future) — no cron job needed.
5. Prices: stored in USD, shown through `price(usd)` ([PRICING.md](PRICING.md)).

## Data flow (admin)
Login (`signInWithPassword`) → session in localStorage → `select *` on the table (RLS also returns **unpublished** rows to signed-in
users) → form built from `admin/schema.js` → `insert` / `update` / `delete`. Reordering renumbers `sort_order` 1..n. Uploads go to
`media/<folder>/<timestamp>-<name>` and the public URL is stored in the row.

To make a new field editable: add the column (migration) → add one entry to `SECTIONS` in `admin/schema.js` → read it in the
component. No other admin code changes.

## Key design decisions
Short records in [adr/](adr/):
- [0001](adr/0001-react-vite-tailwind.md) React + Vite + Tailwind instead of the custom HTML bundle
- [0002](adr/0002-supabase-no-custom-backend.md) Supabase directly from the browser, no custom backend
- [0003](adr/0003-usd-base-price-auto-convert.md) One USD base price, auto-converted per visitor
- [0004](adr/0004-bilingual-twin-columns.md) Arabic as twin columns (`title` / `title_ar`)
- [0005](adr/0005-video-hosting-bunny.md) Bunny Stream for course video
- [0006](adr/0006-defer-payments.md) Payments / booking deferred; WhatsApp in the meantime

## Styling
Tailwind utility classes. Brand tokens (green `#123F35`, gold `#C1922F`, terracotta `#A9532A`, accent `#DD8452`, cream, sand, ink)
and fonts (Newsreader headings, DM Sans body; Tajawal / Almarai for Arabic) are defined in `tailwind.config.js` and `index.css`.
Fonts are self-hosted through `@fontsource` (no Google Fonts requests). Layout uses logical properties (`ms/me/ps/pe/start/end`) so
Arabic mirrors automatically.
