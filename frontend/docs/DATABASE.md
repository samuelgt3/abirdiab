# Database

PostgreSQL on Supabase. Project `abir-diab-site` (ref `tiahqrrchxvhffynlvrl`, eu-central-1).
Schema source of truth: `supabase/migrations/`. Migration 0001 was reverse-engineered from the live project (columns,
constraints and policies were read back and match).

## Conventions
- Every content table has `id uuid`, `sort_order int` (smaller shows first), `published bool`, `created_at`.
- **Bilingual** fields come in pairs: `title` (English) and `title_ar` (Arabic). Arabic is optional; the site falls back to English.
- Money is `price_usd numeric` — always US dollars. Conversion is display-only ([PRICING.md](PRICING.md)).
- Media is stored in the public Storage bucket `media`; rows hold the URL. Old rows may hold a bundled path like `images/x.jpg`.

## Tables

### `testimonials`
`kind` (`written` | `voice` | `screenshot`), `name`/`name_ar`, `role`/`role_ar` (the service), `quote`/`quote_ar`
(for voice notes: the transcript), `summary`/`summary_ar` (voice), `via`/`via_ar` (screenshots, e.g. "WhatsApp message"),
`audio_url`, `image_url`, `image_url_ar`.

### `courses`  (Audio meditations, Video courses, PDF manuals)
`type` (`Audio` | `Video` | `PDF`), `category`/`_ar`, `title`/`_ar`, `description`/`_ar` (card), `full_description`/`_ar` (detail),
`meta`/`_ar` ("22 min"), `badge`/`_ar`, `what_you_get`/`_ar` (**jsonb array of strings**), `image_url`, `video_id`
(Bunny Stream), `file_url` (free download), `price_usd`, `is_free`, `downloadable`.
Added by **0002**: `pack_items jsonb` (the "inside this pack" list) and `has_teaser bool`.

`pack_items` element: `{ "kind": "a|v|p", "title", "title_ar", "length", "length_ar", "description", "description_ar" }`
(`a` audio, `v` video, `p` PDF).

### `workshops`
`title`/`_ar`, `starts_at timestamptz`, `time_label`/`_ar` (text visitors read, e.g. "19:00 GST"), `spots`, `price_usd`,
`format`/`_ar`, `duration`/`_ar`, `overview`/`_ar`. Past workshops are hidden by the front end.

### `journal_posts`
`category`/`_ar`, `read_time`/`_ar`, `title`/`_ar`, `excerpt`/`_ar`, `body`/`_ar` (blank line = new paragraph), `image_url`, `published_at`.

### `newsletter_subscribers` (migration 0004)
`email` (unique, case-insensitive, format-checked), `lang` (`en`|`ar`), `created_at`. Visitors can **insert only**; they can never read
the list. Signed-in admins can read/delete. Export: Table Editor → `newsletter_subscribers` → Export to CSV.

### `orders` (migration 0006)
One row per booking or purchase made on the site. `ref` (e.g. `AD-3C5E15`, shown to the client), `kind`
(`session` | `workshop` | `course` | `gift`), `item_id`, `item_title`, `session_date` / `session_time` / `session_timezone`,
`amount_usd` (**computed by the database**), `display_currency` / `display_amount` (what the visitor saw), customer `name`,
`email`, `phone_dial` + `phone`, `delivery_method` (workshops), gift recipient fields, `status`
(`awaiting_payment` → `paid` / `confirmed` → `completed`, or `cancelled` / `refunded`), `admin_notes`.
**No card data is ever stored.** Visitors cannot read or write this table; they call `create_order(p jsonb)`, which validates
everything (name, email, 7–12-digit phone, date window, weekday, time slot, item is published / workshop not past) and returns
`{ref, amount_usd, status}`. Admins read and update it in `/admin` → Bookings & orders.

### `site_settings` (migration 0006, single row `id = 1`)
`session_price_usd` (empty = "price confirmed after booking"), `session_length` / `_ar`, `booking_times` (text[] of `HH:MM`),
`booking_timezone` (IANA, default `Asia/Dubai`), `booking_days_ahead`, `booking_weekdays` (0 = Sunday). Public read; admin edit in
`/admin` → Booking settings.

### `testimonial_submissions` (migration 0006)
Stories sent with "Share your story": `name`, `email`, `service`, `story`, `lang`, `consent` (always true), `status`
(`new` | `published` | `archived`). Visitors submit through `submit_story(p jsonb)` only and cannot read the table.

### Accounts, links and the allow-list (migration 0008)
- `admins(email)`: who may edit. `is_admin()` checks that the signed-in user's **confirmed** auth account has an email on this list (matched by user id, not by a value in the token). Admins are added with SQL: `insert into public.admins values ('new@email')`.
- `orders.user_id` (set when the buyer was signed in), `orders.delivery_method` + `delivery_to` (email address or WhatsApp number for the link), `orders.join_url` (a session's own video-call link, made automatically when it is paid).
- `workshop_links(workshop_id, join_link)`: the joining link per workshop, admin-only (never exposed by the public workshops read).
- `booking_page(ref)`: public; returns the booking and the link **only** from 2 h before the start to 12 h after, once paid; workshop links only for the signed-in owner.
- `my_orders()` / `my_library()`: signed-in only; the customer's bookings and purchased courses.
- `create_order()` now requires sign-in for courses/gifts, requires a delivery choice for sessions, and forces guests' workshop links to email.

### `admins` (legacy note: the optional 0003 file is superseded by 0008)
`email` primary key. No API access; used only by `is_admin()`.

## Security rules (RLS)
All four tables have RLS **on**:
| Who | Read | Insert / update / delete |
| --- | --- | --- |
| Anyone (anon) | rows with `published = true` | no |
| Signed-in user (`authenticated`) | all rows, including hidden | **yes** (baseline) |

Storage `media`: anyone can read; `authenticated` can upload/update/delete.

⚠ Baseline = *any signed-in user is an admin*. That is acceptable only with public sign-ups **off**. Migration 0003 tightens this to an
explicit email allow-list. See [SECURITY.md](SECURITY.md).

## Migrations
| File | Status on live project | Purpose |
| --- | --- | --- |
| `0001_init.sql` | already applied (do not re-run) | Tables, RLS, storage bucket + policies |
| `0002_course_packs.sql` | applied 2026-11-14 (packs filled for all 13 courses) | `pack_items`, `has_teaser` |
| `0003_admin_allowlist.sql` | optional, **not applied** (needs the real admin email first) | Email allow-list for writes |
| `0004_newsletter.sql` | applied 2026-11-14, tested | Newsletter sign-up table (insert-only for visitors) |
| `0005_rls_initplan.sql` | applied 2026-11-14 | Advisor performance fix for the read policies |
| `0006_orders_settings_stories.sql` | applied 2026-11-14, tested | Bookings/orders, booking settings, story submissions |
| `0008_accounts_and_links.sql` | applied 2026-11-14 | Admin allow-list for every write, customer accounts on orders, `workshop_links`, `booking_page()` / `my_orders()` / `my_library()`, sign-in + delivery rules in `create_order()` |
| `0009_google_signin_switch.sql` | applied 2026-11-14 | `site_settings.google_signin_enabled` |
| `0007_paymob.sql` | applied 2026-11-14 | Paymob: payment switch + currency, charge fields, `payment_events`, `record_payment()`, `order_status()` — see [PAYMENTS.md](PAYMENTS.md) |

Supabase advisors after 0006: performance clean; security shows only the two **intended** notices that `create_order` and
`submit_story` can be called by visitors (that is their purpose — they validate input, compute prices and never return other
people's data). Re-check after every database change.
| `seed.sql` | already loaded | Starter content for a *fresh* database only |

### How to apply (no tools needed)
1. Supabase dashboard → your project → **SQL Editor → New query**.
2. Open the migration file in a text editor, copy everything, paste, press **Run**.
3. "Success. No rows returned" is the expected result.

All migrations are written to be re-runnable (`if not exists`, `drop policy if exists`) except `seed.sql`.

### Editing pack lists
All 13 live courses already have their lists in the database. To change one, open the course in `/admin` → "Pack contents" and write one line per item, like
```
a | Miraculous Monday — full session | 22 min | Grounding, energy scan and release.
```
(English box) and the Arabic title/length/description in the same line order in the Arabic box.
Until a course has its own list, the site keeps showing the bundled one (matched by English title).

## Backups
Free plan keeps no point-in-time backups. Before big edits, Dashboard → Table Editor → export CSV, or run
`supabase db dump`. Consider a monthly export reminder.

## Seeding an existing database again
`seed.sql` does not check for duplicates. Never run it on a database that already has content.
