# Security

## What is public (and fine to be)
| Item | Why it is safe |
| --- | --- |
| Supabase URL and **anon** key in the built JavaScript | The anon key only grants what RLS allows: read published rows, read media files |
| Content of published rows | It is the website |
| Public `media` bucket | Contains only things shown on the site |

## What must never leave the owner
- The Supabase **service_role / secret** key (bypasses all rules). It is not used anywhere in this project; never add it to `.env*`, code, chat or CI logs.
- Admin passwords. Use a password manager; do not share one login between people — create a user per person.

## How access is enforced
1. Visitors: RLS lets the `anon` role `SELECT` only rows where `published = true`. They cannot write.
2. Admins: log in with email + password (Supabase Auth, JWT). The `authenticated` role can read all rows and write.
3. The browser has **no way to skip** this: the rules run inside Postgres, not in our JavaScript. Hiding the `/admin` link or page is *not* security — the database rules are.

## Known weaknesses and mitigations
| Risk | Status | Mitigation |
| --- | --- | --- |
| Baseline policy = *any* signed-in user can write | Open until sign-ups are confirmed off | Switch **off** "Allow new users to sign up". Better: apply migration `0003_admin_allowlist.sql` |
| Free third-party APIs (country, rates) | Accepted | Failure falls back to USD; consider proxying via Edge Function |
| Anyone with a media URL can open/share it | Accepted for public media | Paid files need signed URLs ([VIDEOS.md](VIDEOS.md)) |
| Newsletter table filled with junk / spam sign-ups | Accepted for now | Format + length checks and unique index in SQL; add a CAPTCHA (e.g. Cloudflare Turnstile) via an Edge Function if abused. Emails are personal data: mention them in the privacy policy (already covered by "subscribe to the newsletter") and honour removal requests |
| Fake or tampered orders (wrong price, past date, someone else's order) | Mitigated | Visitors can only call `create_order()`: it validates every field, takes the price from the database, and never returns other orders. Direct table writes are refused (tested). Supabase lists these two public functions as security *notices* — intended |
| Spam bookings / story submissions | Accepted for now | Server-side validation and length limits; add a CAPTCHA (Cloudflare Turnstile) in the Edge Function if it becomes a problem |
| Card data | Not collected | Cards are typed only on Paymob's hosted page ([PAYMENTS.md](PAYMENTS.md)); the Paymob secret key and HMAC secret live only in Supabase Edge Function secrets |
| Faked "paid" status | Mitigated | Only `paymob-webhook` can mark orders paid: HMAC-SHA512 checked (forged/unsigned → 401, tested), amount + currency compared, each transaction recorded once. `record_payment()` is callable only by the service role |
| Guessing booking references on `order_status()` | Mitigated | 9-character random references; the function returns only status, item and amount — no names, emails or phones. It is the third intended Supabase "public function" notice |
| Customer personal data in `orders` | Protected | Only signed-in admins can read it. Covered by the privacy policy ("bookings … name, email, phone"). Export / delete on request |
| Stored HTML/script injection | Mitigated | React escapes all text; the site never uses `dangerouslySetInnerHTML` |
| Weak admin password | Open | Strong unique password; consider enabling MFA on the Supabase account and the client login flow later |
| Brute-force login | Supabase rate-limits auth by default | Keep default limits |
| Free-plan project pauses after inactivity | Operational | Log in to the dashboard periodically, or upgrade before launch |

## Customer accounts (since 1.6.0)
Public sign-up is **on**. That is safe because every admin power is tied to the `admins` allow-list of *confirmed* emails
(`is_admin()`), enforced in the database for every table and the file bucket. A customer who signs up can read only their own
bookings and courses. Keep **Authentication → Sign In / Providers → Email → "Confirm email" ON**, otherwise someone could register
the admin's address; even then `is_admin()` ignores unconfirmed accounts.
- Known limitation: course files and video ids are still in public columns of `courses` (and the `media` bucket is public), so a
  determined person who knows the file address could open a paid file without buying. Fixing it properly needs private storage with
  signed links (and Bunny signed URLs for video) — see ROADMAP.
- Supabase lists `booking_page`, `my_orders`, `my_library`, `is_admin`, `create_order`, `order_status`, `submit_story` as "callable
  SECURITY DEFINER" notices. They are intended; each checks its input and returns only what it should (tested).

## Pre-launch checklist
- [ ] **Create the admin account**: Supabase → Authentication → Users → Add user → email `the admin's email` + a strong password, tick **Auto Confirm User**. (No admin account existed yet.) To use another email, add it to the `admins` table first.
- [ ] Authentication → Sign In / Providers → Email: **Confirm email = ON**, and **Allow new users to sign up = ON** (customers need it).
- [ ] Test: sign in at `/admin`; then sign up as a normal customer with another email and confirm `/admin` shows "No admin access".
- [ ] Supabase's built-in email sender is limited (a few emails per hour). Before launch set up a proper email sender (Authentication → SMTP, e.g. Resend) so confirmation emails always arrive.
- [ ] Dashboard → **Advisors → Security** shows no unresolved warnings (RLS enabled on every table).
- [ ] `.env.local` is not committed (`git status`), and no `service_role` key appears anywhere (`git grep service_role`).
- [ ] Site Auth URL (Site URL) set to the real domain.
- [ ] HTTPS enabled; HTTP redirects to HTTPS.
- [ ] Privacy policy mentions the country/exchange-rate lookups if the client wants full disclosure (`src/content/policies.json`).
- [ ] A backup (CSV export) of all four tables taken.
- [ ] Privacy and refund policy text reviewed by the client (dates in them are placeholders: "Last updated: 3 October 2026").

## Reporting a problem
Anyone who finds a security issue should contact the project owner directly rather than posting publicly.
