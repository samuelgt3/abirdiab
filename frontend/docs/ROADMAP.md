# Roadmap — what is not built yet

**Done:** on-site booking and checkout (1.3.0) and **Paymob card payments (1.4.0)**: built, deployed and switched off until the
Paymob keys are added. Follow [PAYMENTS.md](PAYMENTS.md) to switch on.

## Not built yet (decided 2026-11-14, waiting on accounts / keys)
| Item | What it needs |
| --- | --- |
| **Emails**: instant thank-you, the 2-hour "your link" email, WhatsApp delivery | An email sender (e.g. Resend, free tier) and, for WhatsApp, Meta's WhatsApp Business API approval. The data is ready: `orders.delivery_method / delivery_to`, `thanks_sent_at`, `join_sent_at`, and the release rule (`booking_page`). A scheduled Edge Function (every 5 min) would find orders whose release time has passed and send the link. **Until then the link is only shown on the website** (booking page / My bookings) and guests have no way to receive a workshop link. |
| **A unique video-call link per 1:1 booking, automatically (done with free Jitsi rooms; a Zoom app would replace this)** | A Zoom "Server-to-Server OAuth" app (account id, client id, secret). Today Abir pastes each session's link in the admin. |
| **Sign in with Google** | Enable Google in Supabase (Google Cloud OAuth client), then tick the switch in Booking settings. |
| **Sign in with Apple** | Paid Apple Developer account; add after Google. |
| **Protected course files / video** | Private storage + signed links; Bunny signed URLs. See SECURITY.md → known limitation. |
| **Course lessons inside My courses** | Real lesson files / Bunny video ids per course (the page already shows what exists). |

## Priority order (suggested)
| # | Item | Why | Rough shape |
| --- | --- | --- | --- |
| 1 | Go live with WhatsApp ordering | Fastest path to revenue; zero payment compliance | Finish [SECURITY.md](SECURITY.md) checklist, deploy |
| 2 | Online payments | Remove manual steps | See options below |
| 3 | Student accounts + "My courses" | Needed to protect paid files/videos | Supabase Auth for students + `purchases` table |
| 4 | Paid video / audio delivery | Content is the product | Signed URLs via Edge Function ([VIDEOS.md](VIDEOS.md)) |
| 5 | Workshop booking with seat counting | Today `spots` is edited by hand | `registrations` table + decrement on payment |
| 6 | 1:1 session booking | Calendar + payment | Cal.com / Calendly embed first; custom later |
| 7 | Sending email | Joining links, receipts, newsletters to the sign-ups already collected (migration 0004) | Resend / MailerLite; import the CSV |
| 8 | Voice-note audio, more content | Content gaps | Upload via admin |
| 9 | Workshops carousel | The design auto-slides 3 cards at a time; the grid is fine while there are few upcoming workshops | Add when there are 4+ upcoming |

## Payments — options
The client's privacy policy already mentions **card processors, Fawry and Vodafone Cash** (Egypt). Decide the market first.
| Option | Good for | Notes |
| --- | --- | --- |
| **Stripe Checkout** | Cards worldwide, USD | Simple hosted page; Egypt-based businesses may not be able to open Stripe accounts directly — verify eligibility |
| **Paymob** / **Fawry** | Egyptian cards, wallets, Fawry kiosks | Local rails; EGP |
| **Paddle / Lemon Squeezy** (merchant of record) | Digital products, handles VAT | Fees higher; fewer compliance duties |
| Manual (bank / InstaPay + WhatsApp confirm) | Day one | No integration; staff confirm by hand |

Whatever is chosen, a payment must be confirmed by a **server-side webhook** (Supabase Edge Function) that writes the purchase row.
Never trust the browser to say "paid". Prices stay USD-based ([PRICING.md](PRICING.md)) unless the provider supports per-currency prices.

## Data model sketch (for items 3–5)
```
profiles(id → auth.users, name, phone)
purchases(id, user_id, course_id | workshop_id, amount_usd, provider, provider_ref, status, created_at)
registrations(id, workshop_id, name, email, delivery_method, delivery_to, status)
```
RLS: users read only their own rows; only the webhook (service role, inside the Edge Function) inserts purchases.

## Smaller known issues / ideas
- Cart (multiple items) — the old demo had one; not needed until payments exist.
- Admin: bulk reorder by drag-and-drop; image resizing before upload; "duplicate item" button; audit log of changes.
- Per-service "learn more" pages and a proper blog URL per post (`/journal/<slug>`) for SEO.
- SEO: pre-render the home page (the site is client-rendered; Google handles it but social previews use the static `<head>`).
- Accessibility audit (keyboard + screen reader pass); the base uses semantic HTML, focus rings and labelled controls.
- Analytics (privacy-friendly, e.g. Plausible) — decide with the client.
- Privacy-policy date and the free-API disclosure ([SECURITY.md](SECURITY.md)).
