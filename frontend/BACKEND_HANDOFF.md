# Backend hand-over — Abir Diab website

**Start here.** This folder is the finished website (front end + admin screen). It contains **no backend code**. Your job is to build the backend it talks to, connect the outside services, and take it live.

The site already runs without a backend (it shows built-in sample content and the booking/payment steps say "offline"):

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # lint + tests + build (must stay green)
```

Everything the site needs from a backend is listed below as a **contract** (names, inputs, outputs, rules). The front end already calls these exact names, so if you build them as written, the site works with **no front-end changes**.

> **Read this first — one decision.** The front end talks to the backend through the `@supabase/supabase-js` library (login, database calls named `rpc(...)`, file storage, and "functions"). The fastest path is to build the backend on **Supabase** (Postgres + Auth + Storage + Edge Functions), because then nothing in `src/` changes. If you prefer your own stack (Node/Laravel/Django…), you must either (a) expose a Supabase-compatible API, or (b) replace the calls in `src/lib/*.js`, `src/admin/*.jsx` and a few components (about 30 places, listed in section 3 and 4). Ask the owner which one she wants before starting. This document is written so both work.

Other docs in `docs/` describe the previous backend and the reasoning; they are useful background, **but this file is the authority**. Old docs may mention a specific Supabase project: ignore it, you build a fresh one.

---

## 1. What the business needs (the rules the backend must enforce)

Abir Diab sells energy-healing services. English and Arabic (right-to-left). Everything is booked and bought **on the website**.

1. **Products:** (a) 1:1 session (online video call), (b) live workshops, (c) digital "materials" (courses, meditations, manuals; some free), (d) gifts (a material bought for someone else).
2. **Pay first, book after.** Nothing is saved as an order until the card payment is confirmed by the payment provider. A visitor does **not** sign up or log in before paying. Before payment only a **30-minute hold** on the time slot / workshop seat exists (the hold has no name, email or phone).
3. **Prices are stored in USD** and shown in the visitor's own currency (the front end converts for display). The card is charged in one configurable currency (default EGP), converted at that day's rate and rounded **up**.
4. **After payment:**
   - **1:1 session:** a link to the video call is created **right then**, unique per booking, and shown immediately + emailed.
   - **Workshop:** the link is **not** shown. It is released **2 hours before the start** (Abir pastes one link per workshop in the admin; the backend emails it and shows it on the booking page from 2 h before).
   - **Materials:** unlock immediately on payment (private files / video).
   - **Gift:** a one-time claim link; the receiver signs in and the material is added to their account.
5. **Guest checkout.** The payer gets a private key stored in their browser (`localStorage`, key `abir-access:<REF>`). The backend stores only its **SHA-256 hash**. With the key, that device can open the booking page with no login. After paying, the site sends the customer to a one-step "choose a password" screen so they get an account; orders made with the same **confirmed email** (or with a matching device key) are attached to the account automatically.
6. **Join button rules** (front end implements; backend must agree): the Join button works from **30 minutes before** the start until **6 hours after**. The session link is returned by the API only until **6 hours after** the start. Workshop link returned from **2 hours before** until **6 hours after**.
7. **No cancel / reschedule / refund screens, by design.** Refunds are handled by hand in the payment dashboard. (The refund policy text says this.)
8. **One admin allow-list.** Only listed admin emails can read private data or write content (Abir and the developer).
9. **Privacy:** card numbers never touch our code (typed only into the payment provider's form). Customers must never be able to read admin notes, other people's orders, payment events or private links.

---

## 2. What you must build — checklist

Tick these off. Details are in sections 3–6.

**Core**
- [ ] Database tables, indexes and access rules (3.1, 3.2)
- [ ] The ~25 database functions the site calls (3.3)
- [ ] Authentication: email + password, password reset, Google sign-in, admin allow-list (3.4)
- [ ] File storage: public `media` bucket and private `paid-files` bucket with signed links (3.5)
- [ ] Scheduled jobs (3.6)
- [ ] Seed content (3.7)

**Integrations (outside services — each needs an account/keys from the owner)**
- [ ] **Paymob** card payments: start-payment endpoint + signed webhook (4.1)
- [ ] **Zoom** (or the video service the owner picks): a unique meeting per 1:1 booking (4.2)
- [ ] **Email** provider (Resend/SES/…): confirmation, workshop link, gift, reminders, OTP (4.3)
- [ ] **OTP / verification** by email + SMS/WhatsApp (Twilio Verify or similar) (4.4)
- [ ] **Google sign-in** (4.5)
- [ ] **Visitor country by IP** endpoint for currency (4.6)
- [ ] **Currency rates** (front end uses a free public source; decide if you proxy it) (4.7)
- [ ] **Video hosting** for paid course videos (Bunny Stream) (4.8)
- [ ] **WhatsApp** (site only uses plain `wa.me` links; optional automation) (4.9)
- [ ] **Account deletion** endpoint (4.10)

**Before going live**
- [ ] Security must-dos (section 5)
- [ ] Launch checklist (section 7)
- [ ] Acceptance tests (section 6)

---

## 3. Contract the front end calls

### 3.1 Tables

Columns as the site uses them (types are Postgres-style). `*_ar` columns hold the Arabic version of the text next to it.

| Table | Purpose | Columns |
|---|---|---|
| `site_settings` (1 row, `id = 1`) | owner-editable settings | `session_price_usd numeric`, `session_length text`, `session_length_ar text`, `booking_times text[]`, `booking_timezone text`, `booking_days_ahead int`, `booking_weekdays int[]`, `payments_enabled bool`, `payment_currency text` (default EGP), `payment_test_mode bool`, `google_signin_enabled bool`, `require_email_verification bool`, `require_phone_verification bool`, `session_link_base text`, `emails_enabled bool`, `updated_at` |
| `availability_slots` | free 1:1 times Abir posts | `id uuid`, `slot_date date`, `slot_time text` ("HH:MM", in `booking_timezone`), `created_at` |
| `orders` | **paid** purchases | `id uuid`, `ref text unique` (like `AD-XXXXXXXXX`), `kind` (`session`/`workshop`/`course`/`gift`), `item_id uuid`, `item_title`, `session_date`, `session_time`, `session_timezone`, `amount_usd`, `display_currency`, `display_amount`, `customer_name`, `email`, `phone_country`, `phone_dial`, `phone`, `country`, `lang` (`en`/`ar`), `notes`, `delivery_method` (`email`/`whatsapp`), `delivery_to`, `gift_to_name`, `gift_to_email`, `gift_message`, `status` (`awaiting_payment`/`paid`/`confirmed`/`completed`/`cancelled`/`refunded`), `charge_currency`, `charge_amount_cents bigint`, `fx_rate`, `paymob_intention_id`, `paymob_order_id`, `paymob_transaction_id bigint`, `paid_at`, `user_id uuid` (null for guests until claimed), `join_url` (the per-booking video link), `thanks_sent_at`, `join_sent_at`, `created_at`, `updated_at` |
| `order_admin_notes` | owner's private notes (**customers must never read**) | `order_id uuid pk → orders`, `notes`, `updated_at` |
| `order_access_keys` | guest device keys (hash only) | `ref`, `key_hash` (SHA-256 hex), `created_at` |
| `checkout_holds` | 30-minute holds, no personal data | `ref`, `kind`, `slot_date`, `slot_time`, `workshop_id`, `expires_at`, `user_id` |
| `checkout_attempts` | rate limit | `ip_hash` (one-way hash), `at` |
| `payment_events` | one row per provider callback | `transaction_id bigint pk`, `provider`, `ref`, `success`, `pending`, `amount_cents`, `currency`, `outcome` (`paid`/`duplicate`/`unknown_order`/`needs_refund`/…), `raw jsonb`, `note`, `created_at` |
| `gifts` | gift claim links | `id`, `token text unique`, `order_id`, `course_id`, `mode` (`card`/`direct`), `sender_name`, `recipient_name`, `recipient_email`, `message`, `lang`, `recipient_sent_at`, `redeemed_by uuid`, `redeemed_at`, `created_at` |
| `courses` | materials | `id`, `category(_ar)`, `type` (course/meditation/manual…), `title(_ar)`, `description(_ar)`, `full_description(_ar)`, `meta(_ar)`, `badge(_ar)`, `what_you_get(_ar) jsonb`, `image_url`, `price_usd`, `is_free`, `downloadable`, `sort_order`, `published`, `pack_items jsonb`, `has_teaser`, `created_at` |
| `course_files` | **private** file / video of each course (admin-only table) | `course_id`, `file_path` (in `paid-files`), `video_id` (Bunny) |
| `course_activity` | last opened | `user_id`, `course_id`, `last_opened_at` |
| `lesson_progress` | checklist ticks | `user_id`, `course_id`, `lesson_key`, `completed_at` |
| `workshops` | live workshops | `id`, `title(_ar)`, `starts_at timestamptz`, `time_label(_ar)`, `spots int`, `price_usd`, `format(_ar)`, `duration(_ar)`, `overview(_ar)`, `sort_order`, `published`, `created_at` |
| `workshop_links` | **private** joining link per workshop | `workshop_id`, `join_link` |
| `journal_posts` | blog | `id`, `category(_ar)`, `read_time(_ar)`, `title(_ar)`, `excerpt(_ar)`, `body(_ar)`, `image_url`, `sort_order`, `published_at`, `published`, `created_at` |
| `meditation_samples` | free audio samples | `id`, `title(_ar)`, `note(_ar)`, `duration(_ar)`, `audio_url`, `sort_order`, `published`, `created_at` |
| `testimonials` | `kind` = `written`/`voice`/`screenshot` | `id`, `kind`, `name(_ar)`, `role(_ar)`, `quote(_ar)`, `summary(_ar)`, `audio_url`, `image_url`, `image_url_ar`, `via(_ar)`, `sort_order`, `published`, `created_at` |
| `testimonial_submissions` | stories sent by visitors | `id`, `name`, `email`, `service`, `story`, `lang`, `consent bool`, `status`, `created_at` |
| `newsletter_subscribers` | | `id`, `email unique`, `lang`, `created_at` |
| `verifications` | OTP codes (4.4) | `id`, `kind` (`email`/`phone`), `target`, `code_hash`, `expires_at`, `attempts`, `ip_hash`, `created_at`, `verified_at`, `used_at` |
| `admins` | allow-list | `email` |
| `admin_audit` | who changed what (trigger on content tables) | `id`, `at`, `actor`, `actor_email`, `table_name`, `op`, `row_id`, `summary`, `changes jsonb` |

Reference numbers: `ref` is generated server-side, unique, hard to guess (`AD-` + 9 random upper-case letters/digits). Gift `token` is long and random.

### 3.2 Access rules (row level)

Turn row-level security on for every table, default deny.

| Who | May |
|---|---|
| anyone (not signed in) | **read** published `courses`, `workshops`, `journal_posts`, `meditation_samples`, `testimonials` (only `published = true`); **insert** `newsletter_subscribers` |
| signed-in customer | read **their own** `orders` (`user_id = their id`) — **never** `order_admin_notes`, `payment_events`, `workshop_links`, `course_files`, `site_settings` |
| admin (email in `admins`) | read/write everything above, upload to storage, read `admin_audit`, `payment_events`, `gifts`, `testimonial_submissions`, `newsletter_subscribers`, `order_admin_notes` |
| the server only (service key) | everything the payment/OTP/email flows need (`begin_checkout`, `finalize_paid_order`, `verifications`, `checkout_*`, …) |

Do **not** expose the settings table directly to the public; use `public_settings()` (below) which returns a trimmed copy.

### 3.3 Functions the site calls (named `rpc` calls)

All inputs/outputs are JSON. "Anyone" = callable without login. Errors: raise an exception whose **message** is one of the phrases in the "errors" column (the front end maps these to friendly text, see `ERR` in `src/lib/orders.js`).

| Name | Who | Input → output | Notes |
|---|---|---|---|
| `public_settings()` | anyone | → `{payments_enabled, payment_test_mode, emails_enabled, google_signin_enabled, require_email_verification, require_phone_verification, payment_currency, session_price_usd, session_length(_ar), booking_times, booking_timezone, booking_days_ahead, booking_weekdays}` | Never include secrets or `session_link_base`. |
| `available_slots()` | anyone | → `[{date:"YYYY-MM-DD", time:"HH:MM"}]` | Posted slots that are in the future (in `booking_timezone`), within `booking_days_ahead`, on allowed weekdays, **not already booked or held**. |
| `workshop_seats()` | anyone | → `{ [workshopId]: {shown:int, sold_out:bool} }` | `shown` = 1 per 5 real seats left (rounded up), so the page never shows the exact count. |
| `check_booking(p)` | anyone | `p` = checkout payload (below) → `{ok:true}` | Validates **without saving**. |
| `place_order(p)` | anyone | → `{ref, amount_usd, status}` | Legacy "save without payment" path, used only when payments are switched off (admin sends a payment link by hand). Keep, or remove together with its call sites. |
| `order_status(ref)` | anyone | → `{status, ...}` or null | Used by the payment-return page to poll until paid. Return only non-personal fields. |
| `booking_page(p_ref, p_key)` | anyone | → booking details incl. `join_url` (only when allowed, see rules) or null | Allowed when the caller **is the order's signed-in owner**, or `p_key` hashes (SHA-256 hex) to the stored key for that ref. Hide `join_url` outside the windows in section 1 (6). Workshop link comes from `workshop_links`. |
| `register_access(p_refs text[], p_key text)` | anyone | → void | Stores `sha256(p_key)` for refs the caller just paid for. Must only work for orders **created in the last few minutes** and without an existing key, or it becomes a takeover hole. |
| `email_has_account(p_email)` | anyone | → bool | Decides "create password" vs "sign in" after paying. (Consider rate-limiting: it reveals whether an email has an account.) |
| `course_access(p_id)` | anyone | → `{file_path, video_id}` or null | Only if the course is free or the caller bought it. |
| `course_unlocked(p_course)` / `can_read_course_file(p_name)` | anyone | → bool | Used by storage rules for the private bucket. |
| `gift_info(p_token)` | anyone | → what's inside, sender, claimable? or null | |
| `submit_story(p)` | anyone | `{name,email,service,story,lang,consent}` → bool | Needs `consent = true`. |
| `my_orders()` | member | → `[orders…]` (own bookings, **without** admin notes) | Session link follows the same time windows. |
| `my_library()` | member | → purchased/free-claimed materials | |
| `my_gifts()` | member | → gifts they bought | |
| `my_payments()` | member | → their payments list | |
| `my_progress()` / `touch_course(id)` / `set_lesson_done(course, key, done)` | member | progress | |
| `my_display_name()` | member | → text | name on their latest booking (greeting fallback). |
| `claim_my_orders()` | member | → int | Attach earlier guest orders whose `email` equals the **confirmed** email of the signed-in account. |
| `claim_with_keys(p_pairs)` | member | `[{ref,key}]` → int | Attach guest orders proven by a matching device key. |
| `redeem_gift(token)` | member | → `{title}` | Errors: `already claimed`, `not paid`, `not found`. |
| `newsletter_subscribed()` / `set_newsletter(subscribe, lang)` | member | → bool | |
| `is_admin()` | anyone | → bool | True when the signed-in email is in `admins`. |
| `begin_checkout(p, p_user)` | **server only** | → `{ref, refs[], count, kind, item_title, amount_usd, payload}` | Validates the cart, **prices it on the server** (ignore any price from the browser), holds slots/seat for 30 min. |
| `finalize_paid_order(payload, txn, success, pending, amount_cents, currency, provider_order_id, raw)` | **server only** | → `paid`/`duplicate`/`ignored`/… | Called by the payment webhook. Creates **all** orders of the payment or none, idempotent on the transaction id. Calls `create_order` / `create_gift_order`. |
| `create_order`, `create_gift_order`, `purge_unpaid_orders`, `scrub_orders_for_user`, `consume_verification` | server only | | Internal. |

**Checkout payload** (what the website sends to start a payment, `kind` decides the rest): `kind`, `item_id` (or several `sessions:[{date,time}]` for multi-session), `customer_name`, `email`, `phone_dial`, `phone`, `phone_country`, `country`, `lang`, `notes` (≤500 chars), `delivery_method`, `delivery_to`, `display_currency`, `display_amount`, gift fields (`gift_mode` `card`/`direct`, `gift_to_name`, `gift_to_email`, `gift_message`), verification ids when required. See `src/components/checkout/CheckoutModal.jsx` and `src/lib/orders.js` for the exact object. **Always re-check price, availability and seats on the server.**

**Error phrases** the front end understands: `invalid name`, `invalid email`, `invalid phone`, `phone required`, `time not available`, `date not available`, `day not available`, `date and time required`, `slot taken`, `sold out`, `verification required`, `payment required`, `payments not open`, `invalid gift mode`, `workshop not available`, `item not available`, `invalid gift email`, `too many sessions`, `session price not set`, `sign in required`, `delivery required`, `invalid whatsapp`, `rate_limited`.

### 3.4 Authentication

The site uses: `signUp`, `signInWithPassword`, `signInWithOAuth` (Google), `resetPasswordForEmail`, `updateUser` (password / name), `signOut`, `getSession`, `onAuthStateChange`.
- Email + password accounts; password rule is in `src/lib/password.js` (keep both in step).
- Password reset email must link back to the site (`/account`).
- Admin = a signed-in user whose email is in `admins`. The admin screen is `/admin`.
- Turn on **leaked-password protection**.
- If you do not use Supabase Auth you must provide the same session object shape to `src/lib/supabase.js` or rewrite the ~10 auth call sites (`src/components/AuthForm.jsx`, `QuickAccess.jsx`, `src/pages/AccountPage.jsx`, `src/pages/account/ProfileTab.jsx`, `src/admin/AdminApp.jsx`).

### 3.5 File storage

| Bucket | Access | Used for |
|---|---|---|
| `media` | **public read**, admin write | images and audio shown on the site (`storage.from('media').upload/getPublicUrl/remove`) |
| `paid-files` | **private**; read only when `can_read_course_file(name)` is true (free course, or the caller bought it); admin write | PDFs/manuals; the site asks for a **signed URL** (`createSignedUrl(path, 3600)`) |

### 3.6 Scheduled jobs

| Job | Every | Does |
|---|---|---|
| purge unpaid | 10–15 min | delete expired `checkout_holds`; remove stray `awaiting_payment` orders older than the hold time |
| reminders | 5 min | find paid orders starting within **2 hours** that chose email and have a link and no `join_sent_at`: email the joining link, set `join_sent_at`. Workshops: use the link from `workshop_links`. Keep trying until 6 h after the start. |
| gift emails | 5 min | send `direct` gifts (`recipient_sent_at`) |
| cleanup | daily | delete `checkout_attempts` older than 24 h, expired `verifications` |

### 3.7 Seed content

The site shows built-in sample content when the database is empty (`src/data/fallback.json`: 15 testimonials, 13 courses, workshops, 4 journal posts). Ask the owner for the real content or import this file into the tables above. Set a **real session price** (the test value is `$50`).

### 3.8 Admin screen (already built, in `src/admin/`)

It reads/writes the tables above directly as the signed-in admin. Screens: Dashboard, Orders (status, joining link per booking, workshop link, private notes, Join button), Availability, Courses, Workshops, Journal, Meditations, Testimonials, Stories, Subscribers, Settings (payments on/off, test mode, currency, booking hours, "what is connected" status), Audit. It calls one function, **`setup-status`** (4.11).

---

## 4. Integrations

Every secret goes in the backend's secret store, **never in the website code and never in chat/email**. The website only ever holds the public URL + public key.

### 4.1 Paymob (card payments) — **must**

Flow (already designed on the front end):

```
Browser ──▶ POST paymob-checkout (checkout payload)
   server: rate limit (≤10 per visitor per 10 min, hash the IP) → check payments_enabled → begin_checkout() (price + 30-min hold)
           → fx rate USD→payment_currency → create Paymob "intention" for the TOTAL, with our signed booking details in `extras`
   ◀── { url, publicKey, clientSecret, ref, refs, count, amount_usd, amount_cents, currency }
Browser shows Paymob's embedded card form (Pixel 1.2.10, `src/components/checkout/PaymobPixel.jsx`), card typed only there.
Paymob ──▶ POST paymob-webhook (no login; verify_jwt off)
   server: verify Paymob's HMAC (SHA-512 over the documented field list) AND our own signature on the booking details
           → finalize_paid_order(): creates ALL paid orders or none, idempotent by transaction id
           → create session link (4.2) → send emails (4.3)
Browser polls order_status(ref) up to ~30 s, then shows the confirmation + link.
Return page: /payment/return?ref=…
```
Must do:
- Secrets: `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_IDS` (comma-separated, one per online method; currency must match), `PAYMOB_BASE_URL` (optional), `SITE_URLS` (allowed return origins).
- Charge amount = `ceil(usd × rate) × 100` cents in the charge currency; USD = `round(usd × 100)`.
- Verify **both** signatures; reject a wrong amount; a payment for a slot taken meanwhile creates no order and is flagged `needs_refund` in `payment_events`.
- **Never** trust amounts from the browser. **Never** create a paid order from the return page, only from the webhook.
- Test with Paymob **test** keys first; run a real test payment and confirm Paymob returns our details in `obj.payment_key_claims.extra` (this was **not yet verified**; if it does not, payments arrive with no booking, outcome `unknown_order`).
- **Test mode** (for demos before keys exist): when `payment_test_mode` is on and **no** `PAYMOB_SECRET_KEY` exists, `paymob-checkout` returns `{testMode:true, p, sig, …}` and the front end shows a pretend card form that calls `test-payment`, which books for real but takes no money. **Test mode must be off at launch** (it is impossible to run once a real secret key exists; keep that guard).
- Reference doc: `docs/PAYMENTS.md`.

### 4.2 Zoom (video call per 1:1 session) — **must**

Today the app generates a placeholder link (`session_link_base` + random id, a public Jitsi room). The owner wants **real, unique meetings**:
- When an order of kind `session` becomes **paid**, create a Zoom meeting (Server-to-Server OAuth app; scopes `meeting:write:admin` or equivalent) at the booked date/time in `session_timezone`, duration from `session_length`, **waiting room on**, **no registration**.
- Store the participant link in `orders.join_url` (and the host start link somewhere the admin can open; the admin screen has a **Join** button that uses `join_url`).
- Return `join_url` on the confirmation, in `booking_page`/`my_orders` (windows in section 1), and in the email.
- If Zoom fails, still book, mark the order, and let the admin paste a link by hand (the admin screen already has a field "This session's own joining link").
- Workshops: the admin pastes **one** link per workshop (`workshop_links`); no Zoom call needed (or create it on workshop save if you prefer).
- Secrets: `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`.
- If the owner picks another service (Google Meet, Jitsi…), the contract is the same: one unique link per paid session.

### 4.3 Email — **must**

Provider: Resend (domain verification needed to email customers), SES or any SMTP. Secrets: `RESEND_API_KEY`, `MAIL_FROM` (`Abir Diab <bookings@…>`), `SITE_URL`, `CRON_SECRET` (for the scheduled endpoint). Every email in **English or Arabic** matching `orders.lang` (Arabic = right-to-left, Arabic digits not required). Send **once** (`thanks_sent_at`, `join_sent_at`).

| Email | Trigger | Content |
|---|---|---|
| Booking confirmation, **1:1 session** | on payment | thank-you, date/time, **the link now**, "add to calendar" link, booking page link |
| Booking confirmation, **workshop** | on payment | thank-you, date/time, "your joining link arrives **2 hours before**" |
| Materials / course | on payment | thank-you, link to open in their account |
| Gift (receiver, `mode = direct`) | on payment | "X sent you a gift" + claim link |
| Gift (sender) | on payment | receipt + claim link to share (`mode = card`) |
| Workshop joining link | **2 h before** start | the link |
| 1:1 reminder (optional) | 2 h before | the link again |
| Password reset / account | by auth | branded, bilingual |
| OTP code | when verification on | 4.4 |

Every purchase must send an email. The thank-you page already tells customers their links "have been sent to your email", so this **must work before launch**. Wording/templates used so far are in `docs/EMAILS.md` and are covered by tests in `src/lib/emails.test.js` (the old template code is not in this folder; recreate it, keep the same wording).

### 4.4 OTP / verification — **built into the UI, switched by settings**

The checkout can require a one-time code by **email** and/or **phone**, controlled by `site_settings.require_email_verification` / `require_phone_verification` (both **off** today; the current flow does not ask for codes). Build the three endpoints the front end calls (`src/lib/verify.js`):

| Function | Input | Output |
|---|---|---|
| `send-code` | `{kind:'email'|'phone', target, channel:'sms'|'whatsapp' (phone only), lang}` | `{sent:true}` or `{error}` |
| `check-code` | `{kind, target, code}` | `{verified:true, id}` (the `id` goes into the order) or `{error}` |
| `signup-verified` | `{email, password, name, …, verification ids}` | `{created:true}` or `{error}` — creates the account once the codes were confirmed |

Rules: 6-digit codes, expire in 10 min, **max 5 attempts**, single use, store only a **hash** (`verifications`), rate-limit per target and per IP (hash the IP), never reveal whether a code existed. SMS/WhatsApp through **Twilio Verify** (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID`) or an equivalent. Error codes used by the UI: `send_failed`, `not_configured`, plus the ones in `src/components/checkout/CodeVerify.jsx`.

### 4.5 Google sign-in

`signInWithOAuth('google')`, shown only when `google_signin_enabled`. Create an OAuth client in Google Cloud, add the site's address and the backend's callback URL.

### 4.6 Visitor country by IP — `geo`

The site picks the visitor's currency from their IP. Provide `geo` (callable without login, POST/GET) → `{country:"EG"}` (ISO-2). It may call a free lookup (country.is / ipwho.is) or use your CDN's country header (Cloudflare: `cf-ipcountry`, simplest and free). The front end waits 4 seconds, then falls back to the browser language/time zone. Cache is handled in the browser.

### 4.7 Currency rates

The front end fetches `https://open.er-api.com/v6/latest/USD` directly in the browser for display, and the payment endpoint fetches the same for the charge. Decision for you: keep (free, rate-limited; make the CSP line in `public/_headers` match), or proxy/cache it on your side once a day. If the source is down the payment endpoint returns `fx_unavailable` (503).

### 4.8 Video hosting (paid course videos)

Videos are stored at **Bunny Stream**. `course_files.video_id` holds the video id; the front end builds the iframe URL from `VITE_BUNNY_LIBRARY_ID`. Only return `video_id` through `course_access` when the caller owns the course. Consider Bunny's signed/"token authentication" embed URLs so a shared link stops working. See `docs/VIDEOS.md`.

### 4.9 WhatsApp

The site only opens `https://wa.me/<number>` links (number in `VITE_WHATSAPP`). Customers can choose "deliver my link by WhatsApp" at checkout (`delivery_method = whatsapp`); **automatic sending is not built**. Either send the link by WhatsApp Business API (Twilio/Meta, needs approved templates) or keep it manual: those customers see the link on their booking page and the admin sees the order flagged. Ask the owner.

### 4.10 Account deletion — `delete-account`

Signed-in user → deletes their login, progress and saved details; **orders are kept anonymised** (name/email/phone scrubbed) for accounting; refuse for admins. Called from Settings.

### 4.11 `setup-status` (admin only)

Returns yes/no (never the values) for: `email`, `email_from`, `reminders`, `sms`, `paymob`, `site_url`. The Settings screen shows what is still unconnected. Non-admins get 403.

### 4.12 Also needed from the owner / ops
- A **domain** + hosting for the static site (Cloudflare Pages recommended; `public/_headers` and `public/_redirects` are ready; cPanel `.htaccess` also present). Build with `VITE_SITE_URL=https://the-domain` so the sitemap, share image and canonical links appear.
- DNS for email (SPF/DKIM) so confirmations do not land in spam.

---

## 5. Security must-dos

From the audit in `docs/AUDIT_2026-11-17_FULL.md`:
1. Row-level security on **every** table; test that a customer cannot read `order_admin_notes`, `payment_events`, `workshop_links`, `course_files`, `site_settings`, or another user's order. Server-only functions must not be callable by `anon`/`authenticated`.
2. Verify the Paymob signature **and** the booking-details signature; keep the transaction id unique.
3. Rate-limit: checkout start (done as 10/10 min per hashed IP), OTP send/check, `email_has_account`, `register_access`, newsletter and story forms.
4. Set `access-control-allow-origin` to the real site address once known (it is `*` today); lock `test-payment`/`setup-status` to it.
5. Keep the security headers in `public/_headers` (CSP etc.). After launch test: card form, videos, Google sign-in under the CSP.
6. Never log card data, passwords, OTP codes or full secrets. Keep the service key server-side only.
7. Change/rotate: admin password, any key that was ever shared. Enable leaked-password protection.
8. Delete all test orders and test accounts before launch.

---

## 6. Acceptance tests (do these before telling the owner it is done)

1. **Fresh visitor**, English and Arabic: home loads from the database; currency matches the visitor's country; the currency menu works.
2. **1:1 session as a guest**: pick a slot → details → card (Paymob test card) → paid → confirmation shows the **link at once**, email arrives, the slot disappears for others, a second browser cannot buy the same slot during the 30-minute hold.
3. After paying, "View my booking" → one-step password screen → account shows the booking; signing in later on another device with the same email shows it too.
4. **Workshop**: confirmation says the link comes 2 hours before; no link in the response; link appears from T−2 h; Join works from T−30 min to T+6 h only (booking page, account, admin).
5. **Materials**: paid → unlocks; unpaid user gets nothing from `course_access` or the private bucket.
6. **Gift** both modes: receiver claims once; second claim fails (`already claimed`).
7. **Abandoned payment** leaves no order; the hold expires; the slot returns.
8. **Failed / duplicate webhook**: no double order; wrong amount rejected; slot-taken-meanwhile flagged `needs_refund`.
9. **Privacy checks** as a signed-in customer through the API: cannot select `order_admin_notes`, others' orders, `payment_events`, `workshop_links`.
10. **Admin**: only listed emails; Orders screen shows link, notes, statuses; Settings shows correct connection status.
11. **OTP** (when switched on): wrong code ×5 locks; expired code fails; used code can't be reused.
12. `npm run check` is green; the site's mobile and Arabic views still look right after launch headers.

---

## 7. Launch checklist

- [ ] All secrets set (Paymob, Zoom, email, Twilio, Google) — **status shown in Admin → Settings**
- [ ] Test payments **off**, real Paymob keys on, one real low-value payment tested and refunded by hand
- [ ] Real session price set; real availability posted; real workshops added with joining links
- [ ] Email domain verified; a real confirmation received in Gmail **and** Outlook inbox (not spam)
- [ ] Cron jobs scheduled (3.6) and seen to run
- [ ] Test orders/accounts deleted; admin password changed; admin list = Abir + you
- [ ] `VITE_SITE_URL` set for the production build; sitemap, `robots.txt` and share image check out
- [ ] CORS locked to the real domain; headers verified (securityheaders.com)
- [ ] Backups on for the database; error monitoring on the functions
- [ ] The owner has the admin guide (`docs/ADMIN_GUIDE.md`)

## 8. Front-end settings (the only values the site needs)

Copy `.env.example` to `.env.local`:

| Name | Meaning |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | backend URL + **public** key (never a service/secret key) |
| `VITE_SITE_URL` | public address of the site (no trailing slash) |
| `VITE_BASE` | only if the site lives in a sub-folder |
| `VITE_WHATSAPP`, `VITE_CONTACT_EMAIL` | contact details shown on the site |
| `VITE_BUNNY_LIBRARY_ID` | Bunny Stream library for course videos |

## 9. Where things are in the code

- `src/lib/orders.js` — every call to the backend for bookings, payments, gifts, guest keys, join rules.
- `src/lib/verify.js` — OTP calls. `src/lib/supabase.js` — the one place the client is created.
- `src/components/checkout/` — the checkout window (details, card, confirmation) and `PaymobPixel.jsx`.
- `src/pages/AccountPage.jsx`, `src/pages/account/` — the customer area.
- `src/admin/` — the admin screen (direct table access, see 3.8).
- `src/content/*.json` — all English/Arabic wording (identical keys in both languages; keep it that way).
- Background docs: `docs/ARCHITECTURE.md`, `docs/PAYMENTS.md`, `docs/EMAILS.md`, `docs/SECURITY.md`, `docs/DATABASE.md` (describes the previous backend), `docs/I18N.md`, `docs/DEPLOYMENT.md`, `docs/HOSTING.md`.

Questions about business rules go to the owner; anything that contradicts this file, ask before building.

## 10. Two tests were moved out
`docs/reference-tests/paymob.test.js.txt` (payment amount/signature rules) and `emails.test.js.txt` (email wording) tested the previous backend code, so they were taken out of `src/lib/` to keep `npm run check` green. Treat them as a **specification**: rebuild them against your code and put them back as `src/lib/*.test.js`.
