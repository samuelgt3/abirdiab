# Changelog

Format: [Keep a Changelog](https://keepachangelog.com). Versions follow [SemVer](https://semver.org).

## [1.38.0] — 2026-11-17
### Security
- The owner's **private order notes** now live in their own admin-only table (`order_admin_notes`, migration `0029`, applied). A customer reading their own order can no longer see them. The Orders screen in the admin reads and saves notes there.
- **Checkout rate limit**: one visitor can start at most 10 checkouts in 10 minutes (migration `0030`, `paymob-checkout` v5 deployed). The address is kept only as a one-way hash. Visitors see a friendly "too many attempts" message in English and Arabic.
- Security headers added for hosting: `public/_headers` (Cloudflare Pages) and `public/.htaccess` (cPanel): CSP, nosniff, frame, referrer, HSTS. **Test the card form and videos once after going live** — if one is blocked, the CSP line is the place to look.
- `public/_redirects` added so every address opens the site on Cloudflare Pages.
### Changed
- Gold role text on the testimonials is lighter (readable on dark green); the tick on the 1:1 page is green; grey helper text is darker; admin text below 12px raised to 12px; the full-page grain overlay is removed.
- Arabic: image descriptions and the "Menu" / "Dismiss" labels now follow the language.
- Refund policy no longer promises to "find another time" (there is no rescheduling). Removed unused old wording about verifying a phone.

## [1.37.1] — 2026-11-17
### Changed
- Header: the account / sign-in button is removed (the **My items** link does the same job: members land in their account, visitors on the sign-in screen). The phone menu still has its own sign-in / My account entry.

## [1.37.0] — 2026-11-17
### Fixed
- **"Welcome back, you@email.com" is gone.** The account area greets the customer by **name**. If the account has no name saved, it uses the name on their latest booking (new `my_display_name()` function, migration `0028_my_display_name.sql`, applied). If there is none at all it just says "Welcome back" / "أهلًا بعودتكم" and the sidebar says "My account". An email address is never shown as a name (also on course certificates and in Settings, where the name box now starts filled in).

## [1.36.2] — 2026-11-17
### Changed
- Header: more space between "My items" and the currency/language pill (at least 40 px), and the header may now use up to 1480 px of width (the page content stays at 1240 px), so the menu links stay **exactly centred** on laptops and monitors (checked at 1366 and 1920 px, English and Arabic).

## [1.36.1] — 2026-11-17
### Added
- Header: a new **"My items"** link (Arabic: "مشترياتي") at the end of the centre menu. It opens the same account area (the LMS: 1:1 Session, Workshops, My learning, Gifts) as the account button. It is highlighted while you are in that area; guests land on the sign-in screen. Also in the phone menu.

## [1.36.0] — 2026-11-17 — the Join window: 30 minutes before to 6 hours after
### Changed
- **Join now works from 30 minutes before the start until 6 hours after it** (was 1 hour before, and the link stayed up to 12 hours after). Applies to customers (booking page, My account, the confirmation page) and to Abir's Join button in the admin and dashboard. Outside the window the button is greyed out: before it, with the time it opens; after it, "This meeting has ended, so Join is closed." In English and Arabic.
- The database no longer hands out the joining link after 6 hours (migration `0027_join_window_6h.sql`, applied). The reminder job uses the same 6-hour limit (**send-reminders needs re-deploying with the other email functions**).

## [1.35.0] — 2026-11-17
### Added
- **Admin: a "Join" button for the host.** Every paid booking that has a meeting link now shows a **Join** button in Admin > Bookings (next to the status) and in the Dashboard "Coming up" list, so Abir can open her own session or workshop meeting in one click, at any time (no 1-hour wait like customers). 1:1 sessions use the session's own link; workshops use the workshop's link. It only opens https links, in a new tab. Test added.

## [1.34.5] — 2026-11-17
### Changed
- Header: the menu links (About … Testimonials) are now **exactly in the centre** of the header on monitors; the currency/language pill, "1:1 Session" and the account button are grouped on the right. The account/sign-in button is icon-only (its name shows on hover) so the links can stay centred. The logo's clickable area is only the logo.

## [1.34.4] — 2026-11-17
### Changed
- Header on monitors: the menu links (from "About") now sit further to the right, next to the buttons, instead of floating in the middle. In Arabic they move to the left, mirrored.

## [1.34.3] — 2026-11-17
### Changed
- Header: the account button now sits to the **right of "1:1 Session"**, and the writing on both is smaller (12.5 px, slimmer 1:1 button).

## [1.34.2] — 2026-11-17 — every currency
### Changed
- The header currency menu now lists **every currency we have a live exchange rate for (about 155)**, with a **search box** and names in the visitor's language. The visitor's own country currency is first, then USD, EUR, GBP, EGP, AED, SAR, then A to Z. The list stays inside the screen on phones and closes with Escape or a click outside. Prices format correctly for any currency (for example ¥1,100, ₫180,000). The card is still charged in the currency set in the payment settings.

## [1.34.1] — 2026-11-17 — a calmer header
### Changed
- **FAQ removed from the header** (it stays on the page and in the footer).
- The currency menu and the language switch are now **one small pill** ("ETB ▾ | EN | عربي") instead of two separate boxes.
- **Sign in / My account is just an icon** until the screen is very wide (it keeps its name for screen readers and as a hover tip).
- A little more room between the menu links. Checked at 1366 px, 1024 px and in Arabic.

## [1.34.0] — 2026-11-17 — audit fixes: design, usability, admin
### Fixed
- **Emails**: no more "Complete payment" link to a page that never existed; the "view your booking" buttons (booking email and the 2-hour email) open the right account tab; a 1:1 session email says the link is given as soon as payment is received (only workshops get it 2 hours before). English and Arabic; tests updated. (Needs the four email functions re-deployed together with connecting Resend.)
- **Booking page**: a visitor who is not the owner is told to sign in with the booking email to see the link (with a button), instead of "link will be added shortly".
- **Admin**: the session link label says "customer sees it straight after paying"; free sessions say "free"; "Guest" is now "No account yet" and shown for every kind; cancelling or refunding a booking asks first (and reminds you to refund the card in Paymob); the Bookings menu badge now counts paid bookings not yet marked Confirmed; saving a note or link shows a "✓ Saved" tick; removed the "Copy pay link" and "Copy booking page link" buttons.
- **Prices**: removed the "Approximate; charged in EGP" notes. **New small currency menu in the header** (starts from the visitor's country; the visitor's own currency always stays in the list).
### Improved (phone and design)
- Header: the workshop banner now scrolls away (only the header stays pinned: 90 px instead of 117 px); language switch, currency menu, menu button and logo are 44 px tall on phones; Escape closes the phone menu and returns focus; the floating 1:1 button hides while the footer is on screen; menu order follows the page (Workshops before Materials); Arabic shows "عبير دياب" in the header and footer.
- Filter buttons, "Read transcript", footer links and contact links are at least 40–44 px tall on phones.
- Nothing on the public site is under 12 px any more; orange section labels on dark green use a lighter orange that passes the contrast rule.
- One wording for booking buttons: "Book a session" / "Book now". The invalid gift page has a heading. Home Journal section has the same heading layout as the others and shows a cover picture when a post has one.

## [1.33.0] — 2026-11-17 — every purchase sends an email (from the server)
### Changed
- **Every purchase now sends the customer an email by itself the moment the payment is confirmed**, for all four kinds (1:1 session, workshop, course, gift), without depending on the customer's browser staying open: `paymob-webhook` and `test-payment` send it through the new shared `_shared/mailer.ts`; `booking-email` is now only a safety net and still sends once per order.
- **New wording per kind**: session (the link, or when it comes), workshop (the joining link arrives 2 hours before), course ("your course is unlocked, waiting in My learning"), gift ("your gift link is in My gifts" for a gift card, or "we are emailing <name> their gift"); all with the order reference, "sign in or create your password using <email>", and a button to the right account tab. English and Arabic. Tests added.
- Deployed to Supabase: `booking-email` v3, `paymob-webhook` v3 (still no login needed, Paymob signs it), `test-payment` v2.
- **Nothing is actually emailed until Resend is connected** (secrets `RESEND_API_KEY`, `MAIL_FROM`, `SITE_URL`). Until then purchases still complete and the server logs a warning.

## [1.32.0] — 2026-11-17 — courses and gifts: the same checkout as sessions and workshops
### Changed
- **Paid courses and gifts can be bought without an account** (also from the cart: the cart's checkout no longer demands a sign-in when something paid is in it; free items still need an account because they are added straight to it). After paying: a slim confirmation with a summary card, a numbered **What happens next**, and one button. Course: "Your course is unlocked" and, for a guest, "Create your password" then **Open my course** (the one-step password screen, landing in My learning). Gift: "Your gift is ready"; a guest presses **Get my gift link** (one-step password screen, link waiting in My gifts); a gift sent straight to a person says we email them. Signed-in customers get the same pages with **Open My learning** / **See my gifts**.
- Signed-in customers already get "Your details" filled in (name, email, phone, country), editable, for courses and gifts too.

## [1.31.1] — 2026-11-17
### Fixed
- **Signed-in customers now see their details filled in** on "Your details" (name in three parts, email, phone and country code), all editable. A saved draft from an earlier visit used to wipe those fields out (it restored empty boxes over them); now a draft only brings back what was actually typed. The rules live in `lib/prefill.js` with tests.

## [1.31.0] — 2026-11-17 — account area: 1:1 Session, Workshops, My learning, all filterable
### Changed
- After signing in, the account menu is now **1:1 Session**, **Workshops**, **My learning**, Gifts, Settings (the single "Bookings" tab is split in two; old ?tab=bookings links open 1:1 Session). After booking, "View my booking" lands on the right tab (sessions or workshops).
- **Every one of the three tabs has filters**: 1:1 Session and Workshops: All / Upcoming / Past (with counts), a search box (name, date in words, reference or status) and a sort menu (Upcoming first / Newest / Oldest). My learning: the status buttons (All / In progress / Not started / Completed), a search box and a Type menu (course, meditation, manual...). Works in Arabic. Pure filtering code is tested (accountFilter.js).

## [1.30.3] — 2026-11-17
### Changed
- **Confirm your order**: the **Total** and the **Proceed to payment** button are now pinned to the bottom of the window, so they are always in view (laptop, big monitor and phone) while the order details scroll above them. The page is also a little more compact.

## [1.30.2] — 2026-11-17
### Changed
- The 1:1 session thank-you page now **always** says "Your booking links and times have been sent to your email. They are also below, if you would like to copy them and keep them safe." (as requested). **Before launch, connect email (Resend) so this is true.**

## [1.30.1] — 2026-11-17
### Changed
- **Workshop confirmation redesigned**: a summary card ("You're booked in", workshop, date/time, format and length), a numbered **What happens next** (1 seat confirmed, 2 joining link arrives 2 hours before at <email>, 3 on the day open the link; also in My bookings once they have an account), large calendar buttons, then View my booking / Close. No link shown.
- 1:1 session note, once the email really sends: "Your booking links and times have been sent to your email. They are also below, if you would like to copy them and keep them safe." (before that: "…are below. Copy them and keep them safe.")

## [1.30.0] — 2026-11-17
### Changed
- **Workshops now use the same checkout behaviour as 1:1 sessions**: no sign-in or sign-up before paying; after paying, a slim confirmation (✓ Thank you, reference, workshop name and date) that **does not show a link** but says "You will get your joining link 2 hours before the workshop starts, at <email>" (and, once email is connected, "A confirmation has been sent to your email"), the calendar buttons, and **View my booking** / **Close**. View my booking opens the same one-step password screen (new customers: name, email, password, confirm; existing: email filled in + password). The booking email for workshops already says the link follows 2 hours before the start.

## [1.29.1] — 2026-11-17
### Changed
- The one-step password screen for a new customer now has **Confirm password** (the two must match). Verified in the database that a customer who leaves before choosing a password and signs up later with the same confirmed email gets everything they paid for attached to the new account (and an existing member gets it attached at sign-in).

## [1.29.0] — 2026-11-17 — slim confirmation + one-step password screen
### Changed
- The confirmation after booking is now just: ✓ Thank you, the reference, one note ("links and times have been sent to your email — you can still copy them below"; or just "below" until email is connected), a **collapsed list** of the booking links (press to open: each session with its time, link, Copy, Join, calendar), and two buttons: **View my booking** and **Close**. The account form is no longer on this page.
- **View my booking** (guests) opens the account area on a **one-step screen**, not the normal sign-up: a new customer sees their name and email (editable) and only chooses a password; someone whose email already has an account sees "Welcome back" with the email filled in and only types their password. Terms/Privacy are an implied line, not a checkbox. After that their bookings are in My bookings. Members go straight to My bookings.

## [1.28.0] — 2026-11-17
### Changed
- Checkout totals and every price are shown in the visitor's own currency; the "You will pay about EGP … — $50 converted at today's rate" line is gone from the confirmation and card steps.
- **Currency now comes from the visitor's IP address.** A new `geo` function reads the IP, looks the country up, and returns only the country code; it is remembered on the device for a week. If that fails the device language / time zone is the fallback. About 70 countries map to their own currency. (Privacy policy updated.) No currency picker.
- **"View my booking" / "Open my account"** after booking send visitors to the account: guests get the Create-account (or Sign-in, if the email has an account) window with their details filled in; members go to My bookings. No more booking page from that button.
- The booking confirmation is compact (reference, link with Copy/Join and calendar in one box above the account form).

## [1.27.0] — 2026-11-17 — one page after booking: link + create-password / sign-in
### Changed
- After a guest pays (or books something free) there is **one page**: the thank-you, reference, session link (Copy, Join, calendar buttons, "we emailed it") **and, right below, the account form with their details filled in** (name, phone, email, all editable). New email: "Create your account" (choose a password). Email that already has an account: "Sign in" (they type their existing password). No second window and no redirect. After signing in, the page confirms and offers "Open my account" (My bookings / learning / gifts).
- The booking email goes out at payment, before any login (as before).
- Signing in attaches the bookings paid for on this device by their private key (even if they typed a different email, or have not confirmed it yet), plus earlier guest orders with the same confirmed email; My bookings reloads when that happens.
- The sign-in form is now its own component (`AuthForm`) shared by the sign-in window and the confirmation page.
- Migration `0026_pay_then_account.sql`: `email_has_account`, `claim_with_keys`.

## [1.26.0] — 2026-11-17 — pay first, account after
### Changed
- **Nobody is asked to sign up or sign in before paying.** Booking or buying anything online (sessions, workshops, paid courses, gifts) only records the details typed in the checkout. The old "sign in / create an account" gate and the "create your account" step are gone. Exceptions: free courses/gifts, and the pay-later mode (card payments switched off), are saved straight to an account, so those still ask for one.
- **After payment** the confirmation screen shows the session link with Copy, the Join button (opens 1 hour before), Google/Apple calendar buttons, and the link is emailed. Below that, "Your login details": the email used is the login; the visitor can choose a password to create their account (optional). Their bookings (same email) then appear in My bookings. If the email already has an account, they are told to sign in.
- The session link is shown to the payer without a login through a private key kept in their own browser (only a hash is stored in the database: `order_access_keys`, `register_access`, `booking_page(ref, key)`). Someone who only knows the booking reference does not see the link. Clearing the browser data loses the key, but the emailed link and the account still work.
- Signing in now attaches earlier guest purchases made with the same confirmed email (`claim_my_orders`).
- Migration `0025_guest_checkout.sql`: paid or quoted course/gift orders no longer need a signed-in user.

## [1.25.0] — 2026-11-17
### Changed
- **The Join button only works from 1 hour before the start** (1:1 sessions and workshops). Before that it is greyed out and the page says "Not time to join yet. The Join button opens at <time> (1 hour before the start)", with the time in the booking's zone. It unlocks by itself while the page is open (no refresh needed). The link itself can still be seen and copied earlier. Applies to My bookings, the booking page and the confirmation screen. Workshop links are still only released 2 hours before.

## [1.24.0] — 2026-11-17 — audit fixes (see docs/AUDIT_2026-11-16.md)
### Fixed / added
- Booking is checked BEFORE an account is created (no half-made accounts). Sessions are free (price 0) until a price is set; "no price" = not for sale with a clear message.
- The site says "we emailed it" only when the email was really sent. Admin > Settings has a **Setup checklist** (email, reminders, SMS codes, card payments) and a **Test payments** switch, so each service can be connected later.
- A session's join link is shown only to the signed-in owner (also fixes anyone-with-the-reference access). Booking emails still carry the link.
- Real "page not found" page; per-page titles/descriptions (EN/AR), canonical links, noindex on private pages; sitemap.xml + robots.txt + 404.html at build; friendly error page instead of a blank screen; pages load on demand (main script 328 KB → 260 KB).
- Privacy policy rewritten to match what the site does; country is now worked out on the visitor's device (no outside lookup); **Delete my account** in Settings (wipes personal details from past orders; no data-export button).
- Cart refreshes to live prices and drops unavailable items; checkout details and chosen times survive a refresh.
- Darker small text, bigger footer links and language switch, heading order fixed; passwords need 8+ characters with a letter and a number.
- React Router 7 (npm audit: 0 vulnerabilities). Admin **Activity log** (who changed what). Public settings trimmed (table is admin-only); two internal functions no longer callable from outside.
- Recovered the migration files that existed only in the live database (0014–0016); database tests in supabase/tests; new component tests (119 tests).
- Project is now a git repository with a GitHub Pages deploy workflow (docs/GITHUB_PAGES.md). Old design copies are kept out of the published project.
- Migrations 0023 (audit fixes) and 0024 (delete account) applied; Edge Functions setup-status and delete-account deployed.
### Not done
- No rate limits on public forms; no payment-problem alerts; no two-step admin login; Supabase "leaked password protection" must be switched on by the owner in the dashboard.

## [1.23.0] — 2026-11-16
### Added
- **Payment is open in TEST MODE** so the whole flow can be tried before Paymob is connected. The "Card payment opens here soon" text is gone. After "Proceed to payment" the visitor sees a clearly marked **Test payment** box (fixed demo card, nothing real can be typed) and a **Pay (test)** button; pressing it books for real (booking(s) paid, links, emails, My bookings) but takes NO money. Payment events are noted "TEST payment".
- Safety: the test payment refuses to run as soon as a real PAYMOB_SECRET_KEY is installed, so connecting Paymob switches test mode off by itself; it also needs the admin flag payment_test_mode and our own signature on the booking details. Migration 0022 switched payments_enabled and payment_test_mode ON in the live settings (your request).
- Tested against the live backend: one workshop seat through checkout -> test payment -> paid booking (5 shown as 1,881 EGP, hold released, bad signature rejected). That test booking is named "ZZ Test (delete me)" (AD-D886D0197): delete it in Admin > Orders.

## [1.22.0] — 2026-11-16
### Added
- **Name in three parts** (first, middle optional, last) in the checkout and in Create account; stored as one full name.
- **A confirmation page before payment**: after the details (and account step) the visitor sees everything — name, phone, email, where the link goes, notes, the item, every session with date/time and price, the total — then presses **Proceed to payment**. The details page now lists chosen sessions one per line instead of one long sentence.
- **1:1 session links are given at once.** The moment a session is paid it gets its own private link (made from a new admin setting, default free Jitsi Meet rooms). It is shown on the final screen with Copy and Open buttons, emailed in the booking email, and kept in My bookings. Workshops still release their link 2 hours before, to the signed-in owner. Materials are unlocked as soon as they are paid, as before.
- **Earlier purchases find their account**: bookings and purchases made with an email are attached to the account that confirms that same email, now or later (database trigger + one-time catch-up, migration 0021).
- Admin > Sessions & availability: new field "Where each booked session happens (link start)".
### Notes
- Jitsi's free service asks the host (Abir) to sign in once with Google/GitHub before the first call; a customer waits until the host joins. Paste a different link on any booking in Orders, or change the link start, if another platform is preferred.
- Repo send-reminders now only handles workshops; the deployed copy is unchanged but skips sessions anyway (their link is marked sent when created).
- Not run end-to-end: a real paid session creating its link and email (needs Paymob + Resend); the account-claim trigger was created and run once but not seen with a new sign-up. The link creation and booking page rules were tested in the database (rolled back).

## [1.21.0] — 2026-11-16
### Added
- **One card payment for several 1:1 sessions.** The review step lists every session with its date, time (in the visitor's zone) and price, then the TOTAL, before any payment. One payment covers all of them; each session becomes its own booking with its own reference once the payment is confirmed.
### Changed (the "no order until paid" work is now finished)
- Paying first, booking after: the website sends the booking details to paymob-checkout, which checks and prices them in the database, holds the times/seat for 30 minutes (no personal data) and opens the card form. The booking(s) are created only by the signed Paymob webhook (migration 0020: begin_checkout / finalize_paid_order handle several sessions, all-or-none). A failed or abandoned payment leaves nothing behind.
- The booking details inside the payment are now signed by our own function, and the webhook rejects them if altered (Paymob's own signature does not cover them).
- The old "pay later" page (/pay) and Pay now button are gone, since unpaid bookings no longer exist. Texts that said "your booking is saved" before paying were corrected.
- Tested in the database (rolled back): two sessions paid together create two paid bookings and split the charge; wrong amount, failed payment and a slot taken meanwhile create nothing (the last is flagged needs_refund); a repeated callback is ignored.
- NOT tested: a real Paymob payment (no keys yet), and whether Paymob returns the details we put in the payment (extras) in its callback as we expect. Keep card payments OFF until one real test payment per type (session, several sessions, course, workshop, gift) has been made with Paymob's test cards.

## [1.20.0] — 2026-11-16
### Added
- **Book several 1:1 sessions in one go.** Press as many times as you like, on the same day or different days (the calendar marks days that have a chosen time). A "Your times" box lists them with Remove; the review shows all of them; each session becomes its own booking with its own reference, confirmation email and calendar buttons. If one time is taken meanwhile, the others are still booked and the page says which to pick again.
- Limit: while card payment is on, only ONE session can be paid at a time (a combined payment is part of the unfinished payment work, see HANDOFF). Free bookings can be several.

## [1.19.0] — 2026-11-16
### Changed
- **Session times show the visitor's own time zone, with its name next to the hour** (e.g. "11:00 GST" for the Gulf, "07:00 GMT+3" elsewhere). The zone comes from the visitor's browser/device, which is more exact than an IP guess. The calendar days follow the visitor's zone too (a late Dubai time can fall on the next day abroad). The booking is still saved in the booking zone. The old "Times are in Gulf Standard Time" line is gone.
- **A time that gets booked disappears.** The database already hid booked times and times being paid for; the booking window now refreshes the list on opening, every minute and when the tab is shown again, and drops your choice if someone else just took it.

## [1.18.1] — 2026-11-16
### Changed
- **Choose a day is now a month calendar** (1:1 session booking). Days Abir has posted are green and can be pressed, the rest are greyed out; arrows move between months (they stop at the first and last month with a free day). Works left-to-right and right-to-left.

## [1.18.0] — 2026-11-16
### Added
- **Terms of Use page** (/terms, English + Arabic) linked in the footer and in the sign-up tick boxes. It is a sensible starting text (not medical advice, accounts, sessions and workshops, digital materials, payment, gifts, liability). **Please have it read through, and by a lawyer if you can, before relying on it.**
- **Account created inside the checkout.** A visitor who is not signed in now sees: Sign in, or **New here? Create an account & continue**. They fill in details, then choose a password (confirm + agree to Terms/Privacy), then — when the admin verification switches are on — verify email and phone with one-time codes. The account is created confirmed (new Edge Function signup-verified), they are signed in, the order is placed under it, and they log in later with the same email and password. Applies to 1:1 sessions, workshops, courses and gifts (workshop guests no longer exist).
- If verification is OFF, the checkout falls back to a normal sign-up: Supabase emails a confirmation link and the visitor completes checkout after confirming.
### Changed
- **Signed-in members are not asked to verify again at checkout** (database migration 0019: phone code is skipped for signed-in members; email was already skipped when it matches their confirmed account email).

## [1.17.1] — 2026-11-16
### Changed
- The floating cart button now appears only when the cart has at least one item (it was always visible).

## [1.17.0] — 2026-11-16
### Added
- **Create account now asks for:** phone number (country code + number, required), confirm password, a tick to agree to the Privacy Policy and to be contacted about bookings, and an optional "send me news and offers" tick. Stored on the Supabase user (phone, phone_dial, country, marketing_opt_in, accepted_privacy_at).
- Checkout pre-fills the saved phone; Settings has a phone field so people who signed up with Google can add theirs.
- Not done: the phone is not code-verified at sign-up (verification still happens at booking, when switched on). There is no Terms page yet, so only the Privacy Policy is linked.

## [1.16.1] — 2026-11-16
### Changed
- **Floating cart button** in the lower right of every page (replaces the header cart button). Opens the cart; shows a count badge when it has items. On phones it sits just above the "1:1 Session" floating button.

## [1.16.0] — 2026-11-16
### Added
- **Cart.** Pressing **Unlock full** now asks: **Add to cart & discover more** (keeps you browsing the materials) or **Proceed to checkout**. A cart button with a count appears in the header; the cart lists your items with Remove, a total, Keep browsing and Proceed to checkout. The cart is remembered in the browser.
- Cart checkout asks you to sign in, then: free items are added to My learning together; paid items are bought one at a time with the existing checkout (one paid item, or a Buy this one button per item). While online payment is off it says so.

## [1.15.1] — 2026-11-16
### Fixed
- Watch & Listen: the videos now show ONLY your chosen part (BEyRjrJnG9M 0:00-1:20, wJ6uagpLRyw 0:05-1:00). YouTube's own bar is switched off, so the rest of the video cannot be seen or reached: the player has its own play/pause, a progress bar that covers only the clip, and a replay button at the end. Clicking the video no longer opens YouTube.

## [1.15.0-wip] — 2026-11-15
### Changed (database applied; website and payment functions NOT finished)
- Migration 0018: an order can no longer be created without payment. Priced items are refused unless the payment is confirmed; a tiny 30-minute hold (no personal data) reserves a slot or seat while paying; `finalize_paid_order` creates the order, already paid, only when the payment is confirmed. Tested in the database.

## [1.14.2] — 2026-11-15
### Changed
- Customers only ever see what they **paid for**: Bookings and Gifts in My account no longer list unpaid items (no more Awaiting payment / Pay now there). Enforced in the database (my_orders, my_gifts), not just on the page.
- Admin: unpaid checkouts are not shown as bookings any more (no Awaiting payment card, filter, badge or to-do).
- An unpaid order holds its time slot or workshop seat for 1 hour only.
- Migration 0017 (applied): unpaid orders are deleted automatically after 3 hours (every 10 minutes, and at each new order). Nothing unpaid is kept.

## [1.14.1] — 2026-11-15
### Changed
- My account now looks like a learning platform: a **left menu** (your name and email, then My learning, Bookings with a count, Gifts, Settings, Sign out) and the chosen page opening beside it. On phones the menu becomes a swipeable row of tabs and Sign out moves into Settings.
- **My learning** opens with a welcome banner (courses / in progress / completed), the Continue card, then your courses. **Bookings** has its own title and a **Book a session** button at the top.

## [1.14.0] — 2026-11-15
My account becomes a learning portal. Needs migration 0016 (applied to the live project).

### Added
- **My learning** (the first tab): a "Continue where you left off" card with a Resume button, filters (All / In progress / Not started / Completed), and every course as a card with a cover, status and progress bar.
- **Course view**: tick lessons off as you go (progress saves to your account), watch / listen / download your content, and when every lesson is ticked a congratulations banner with a **printable certificate of completion** (English or Arabic).
- Courses with no lesson list are tracked as one item ("Mark course as complete").
- Database: tables lesson_progress and course_activity; functions my_progress, set_lesson_done, touch_course (a customer can only tick lessons of a course they own).

### Changed
- "My courses" is now "My learning"; old ?tab=courses links still work.

## [1.13.1] — 2026-11-15
### Changed
- My account made friendlier (still simple): a welcome with your initial and one plain sentence ("You have 2 upcoming bookings."), a Book a session button, big pill tabs, and bookings as clear cards: a date tile, the time with "in 19 hours", ONE obvious next step (Pay now / Join now / when your link arrives), and calendar and reference in small print. Calm empty states with a single button. Same card is used on the booking page.

## [1.13.0] — 2026-11-15
My account page tidied: simple and quiet.

### Changed
- My account is now a plain page: your name, a Sign out link, and four underlined tabs: **Bookings** (upcoming, then past), **My courses**, **Gifts**, **Settings** (name and password only).
- Gift links open under Gifts as before. Everything else (overview dashboard, stats, quick actions, payments list and receipts, profile extras, data download) was tried and removed as too much.
- Migration 0015 (`my_payments`, `newsletter_subscribed`, `set_newsletter`) is still in the database but no longer used by the site.

## [1.12.6] — 2026-11-15
### Fixed
- Live Workshops: all cards are exactly the same size (they differed in height depending on their text); the price and Discover button line up on every card.

## [1.12.5] — 2026-11-15
### Changed
- Live Workshops now goes round in a loop: it keeps moving the same way, and after the last workshop the first one comes round again. It no longer rests at the end and glides back to the start. The Previous / Next buttons and manual swiping also go round forever. (If there are so few workshops that they all fit, nothing moves.)

## [1.12.4] — 2026-11-15
### Changed
- Live Workshops: the pause button is gone. Previous and Next are now round buttons on the left and right sides of the row (vertically centred on the cards); Previous hides at the start and Next at the end.

## [1.12.3] — 2026-11-15
### Changed
- **Live Workshops** is now one sideways row (no second row below). It drifts slowly toward the end (right in English, left in Arabic), rests, then glides back to the start. Previous / next buttons and a pause button sit above it. It stops while the mouse is over it or a finger is touching it, and does not move at all for visitors who set reduced motion.

## [1.12.2] — 2026-11-15
### Added
- **Coming soon workshops**: a workshop posted without a date shows as a Coming soon card (not bookable, after the dated ones). Three were posted so the section is never empty. Add a date in Admin -> Workshops to open one for booking. Migration 0014 also blocks booking an undated workshop in the database.

## [1.12.1] — 2026-11-15
### Added
- **Remove** button next to every uploaded picture / audio in the admin, with an audio preview player. Removing or replacing a file, or deleting an item, deletes the stored file as well (only files uploaded through the admin; pasted links are never touched).

## [1.12.0] — 2026-11-15
Home page: playable meditation voices, one video at a time, "Coming soon" workshops. Needs migration 0013 (applied).

### Added
- **Guided Audio** section: each meditation with an uploaded voice plays right there when pressed (play/pause, progress bar). Only one voice plays at a time.
- Admin → **Guided meditations**: add, edit, reorder, hide meditations and upload the audio clip for each. Table `meditation_samples` (the three previous entries were carried over).

### Changed
- **Watch & Listen**: only one video can play at a time (pressing the other stops the first). Both play the teaser (youtu.be/BEyRjrJnG9M) from 0:00 and stop at 1:20.
- **Live Workshops**: with nothing scheduled, the section is a short "Coming soon" band instead of a large empty section.

## [1.11.0] — 2026-11-15
Email and phone verification. Needs migration 0012 (applied to the live project). Everything new is OFF until switched on.

### Added
- **Email typo catcher** (always on): "Did you mean layla@gmail.com?" with one-click fix at checkout.
- **Email code** and **phone code (SMS or WhatsApp)** at checkout, with a new "Verify" step, resend timer and friendly errors in English and Arabic.
- Admin switches under Booking & payments. Edge Functions `send-code` and `check-code` (Resend for email, Twilio Verify for phone). Table `verifications`.
- Orders now go through `place_order()`, which refuses unverified emails/phones when a switch is on; `create_order` / `create_gift_order` can no longer be called directly.
- docs/VERIFICATION.md: setup and provider comparison.

## [1.10.0] — 2026-11-15
Gifts: two ways to give a course. Needs migration 0011 (applied to the live project).

### Added
- "Give a gift" now asks how: **Gift card** (sender fills only their own details and gets a gift link to share) or **Send it to them** (sender fills the receiver's name, email and message; the receiver is emailed the link).
- Gift page `/gift/<token>`: the receiver sees what they were given, signs in or creates an account, presses one button, and the course is added to My courses. A gift can be claimed once and only after the sender's payment is confirmed.
- "Gifts I sent" tab in My account, with each gift link and whether it was claimed.
- Receiver email (English / Arabic) sent by the scheduled `send-reminders` function once the gift is paid.
- Database: `gifts` table; `create_gift_order`, `gift_info`, `redeem_gift`, `my_gifts`.

## [1.9.0] — 2026-11-15
Availability, seats, private files, emails. Needs migration 0010 (applied to the live project).

### Added
- **Sessions & availability** admin page: set the session price, then post the exact days and times Abir is free. The booking window shows only those times, and a time disappears once booked. A slot can never be booked twice (checked in the database, with a unique index).
- **Workshop seats**: "Number of seats" in the workshop form is the real capacity and counts down as people book; at zero the workshop shows Sold out and cannot be bought. Visitors see one fifth of the real number (50 seats shows 10; 5 sold shows 9).
- **Private course files**: video id and file now live in a private table and bucket (`course_files`, `paid-files`); only buyers (or anyone, for free courses) can open them, through short-lived signed links.
- **Emails**: `booking-email` (sent when someone books) and `send-reminders` (joining link 2 hours before). Inactive until a Resend key is added: see docs/EMAILS.md.

### Changed
- `create_order` checks the posted slot, slot ownership and seat capacity; unpaid bookings release their slot/seat after 60 minutes once card payments are on.
- Booking & payments page now only holds sign-in and card payments (session settings moved to Sessions & availability).
- Removed from `courses`: `file_url`, `video_id`. Replaced by `course_files`.

## [1.8.0] — 2026-11-15
Header, Google button, in-course filters, smaller filter buttons, audit.

### Changed
- Header: compact EN | عربي switch, "Sign in / Sign up" button with icon, avatar button when signed in.
- Sign-in window always shows "Sign in/Sign up with Google" (friendly message until Google is switched on).
- Every filter button site-wide uses one smaller shared style.
- Footer shows the country name instead of a two-letter code.

### Added
- "What's inside" filter (All / Videos / Audio / PDFs) inside each course.
- docs/AUDIT.md: 30 ranked problems.

## [1.7.0] — 2026-11-14
Admin redesign: easier to use, more features. No database changes.

### Added
- **Dashboard** home: needs-attention list (paid bookings missing a joining link, workshops without a link, unpaid bookings, new stories, missing price, payments off), key numbers, upcoming events, latest bookings, quick actions.
- **Newsletter subscribers** page: search, copy all emails, CSV export, remove.
- **My account** page: change password, sign out.
- Content lists: search, All/Visible/Hidden filters, thumbnails, instant show/hide switch, move up/down, duplicate (as hidden copy), "view on website", delete confirmation.
- Bookings: stat cards, status chips with counts, type filter, search, CSV export (spreadsheet-formula safe), "Needs link" warnings.
- Editing in a side panel with unsaved-changes warning and Ctrl/Cmd+S.
- Sidebar navigation with live badges (unpaid bookings, new stories); mobile menu; toasts; login with show-password and forgot-password.
- Settings: grouped cards, time preview, one sticky Save bar.

### Changed
- Stories: filters (New/Added/Archived), proper delete confirmation, Move back to New.

## [1.6.0] — 2026-11-14
Customer accounts, sign-in rules, delivery choices and 2-hour link release. Nobody is "contacted" any more: everything happens on the site.

### Added
- **Accounts** (email + password; Google button appears when switched on in admin): header "Sign in" / "My account", `/account` with **My bookings** and **My courses**.
- **Rules:** courses and gifts need an account; workshops: sign in, or continue as a **guest** (told clearly that the link comes by email only); 1:1 sessions: no account needed.
- **1:1 sessions:** the customer chooses how to receive the Zoom link: **email**, or **WhatsApp** — "use this number" or enter a different one (country code + number).
- **Thank-you screens** per type ("Hi {name}, thank you for …"), calendar buttons, and a **booking page** `/booking/<reference>`.
- **Joining link released 2 hours before the start** (until 12 h after), only once paid, with **Join now** and **Copy link**. Workshop links are private: signed-in owners see them on the site; guests only by email. Sessions use the booking's own link.
- Admin: **Joining link** field on each workshop (private table), **Zoom link** field on each session booking, "joining link goes to …" and guest/account info, Google switch, and a **No admin access** screen for non-admins.
- Database (migrations 0008, 0009 applied live): orders belong to users, `booking_page()`, `my_orders()`, `my_library()`, `workshop_links`, delivery fields, sign-in rules enforced in `create_order()`.

### Changed
- **Security:** every admin write is now limited to an allow-list of *confirmed* emails (`admins` table; currently the admin's email) so public sign-up is safe. Before this, any signed-in user could have edited the site.
- Removed all "Abir will contact you" wording. While card payments are off, the booking is saved and the customer pays on the site once it opens.

## [1.5.1] — 2026-11-14
### Added
- While card payments are off, "Review & pay" shows a greyed-out preview of the card form labelled "Opens soon" (`CardPlaceholder.jsx`). It has no input fields, so nothing can be typed into it. Switching payments on replaces it with Paymob's real form automatically.

## [1.5.0] — 2026-11-14
Payment now happens inside the website — no redirect, no emailed payment links.

### Added
- **Embedded card form** (Paymob Pixel 1.2.10, pinned) as a new **Payment** step inside the booking / checkout window. The customer pays without leaving the site; the window then waits for Paymob's confirmed payment and shows "Payment received".
- **`/pay?ref=…`**: finish paying for a saved booking on the site (also used by "Try again" after a failed payment).
- Admin: **Copy pay link** on every unpaid booking.
- `paymob-checkout` now also returns the public key and one-time payment code the embedded form needs (redeployed, v2).

### Changed
- Redirect to Paymob's hosted page is now only a fallback if the embedded form cannot load.
- Messages no longer promise an emailed payment link: while card payments are off, the site says Abir will contact the client to arrange payment.

## [1.4.0] — 2026-11-14
Paymob card payments (built and deployed; switched off until the keys are added). See docs/PAYMENTS.md.

### Added
- Edge Functions `paymob-checkout` (creates the Paymob intention, converts USD → charge currency, returns the secure page) and
  `paymob-webhook` (HMAC-SHA512 verified; the only thing that marks orders paid). Shared code in `supabase/functions/_shared/paymob.ts`.
- Migration 0007 (applied live): `payments_enabled` switch + `payment_currency` in settings, charge fields on orders,
  `payment_events` (each Paymob transaction recorded once), `record_payment()`, `order_status()`, 9-character booking references,
  phone required for card payments.
- "Continue to secure payment" in Review & pay, with the exact charge shown ("about 3,688 EGP — $69 converted at today's rate").
- `/payment/return` page: waits for Paymob's confirmation, shows paid / still confirming / failed + "Try again".
- Admin: card-payment switch and charge currency in Booking settings; card charge, paid time and Paymob transaction on each order.
- Tests: Paymob signature (reproduces Paymob's documented example), amount conversion, reference parsing.

### Changed
- "Charged in USD" wording replaced everywhere by the real charge currency (e.g. "charged in Egyptian pounds (EGP)").

## [1.3.0] — 2026-11-14
Booking and buying happen on the website. Only the explicit WhatsApp buttons open WhatsApp.

### Added
- **On-site booking for 1:1 sessions**: date → time (slots in Abir's time zone, past times hidden) → name, country code + phone, email, optional note → review & pay → confirmation with reference number and Google / Apple / Outlook calendar buttons.
- **On-site checkout** for workshop seats (choose email / WhatsApp / Telegram for the joining link), materials ("Unlock Full"), free items ("Get it free") and gifts (recipient name, email, message).
- **"Share your story"** form on the testimonials page (consent required; nothing is published automatically).
- Database (migration 0006, applied live): `orders`, `site_settings`, `testimonial_submissions`, and the `create_order()` / `submit_story()` functions. Prices are computed by the database, never trusted from the browser.
- Admin tabs: **Bookings & orders** (status, client details, private notes), **Story submissions** (one-click "Add as testimonial", hidden until reviewed), **Booking settings** (session price, length, start times, days, time zone, how far ahead).

### Fixed (course page)
- "Unlock Full" appeared twice → once, in the price card. The top bar now shows Back, title and price only.
- The top bar slid ~46 px under the header when scrolling → it now follows the header's real height.
- A "Play teaser" label showed with nothing to play → removed until a real preview exists.
- Free items without a file showed "Discover More" linking to WhatsApp → "Get it free" (on-site).
- "You may also like" section was titled "Discover More" (same as the buttons).
- Gift button used WhatsApp → on-site gift checkout.

### Not included on purpose
- No card-number form: card details must only ever be typed into the payment provider's secure page. Until a provider is connected, bookings are saved as "awaiting payment" and Abir sends a payment link. See docs/ROADMAP.md.

## [1.2.1] — 2026-11-14
### Database (live project)
- Applied migrations 0002 (pack lists, filled for all 13 courses), 0004 (newsletter, tested end to end) and new 0005 (advisor performance fix for the read policies).
- Supabase security + performance advisors: no findings.
- 0003 (optional allow-list) updated to the same performance pattern; still not applied (needs the real admin email).

## [1.2.0] — 2026-11-14
Separate pages, as in the original design, instead of everything on the home page.

### Added
- `/materials` — full catalogue with search, Courses / Meditations / Manuals chips and a "Gift from Abir" (free) chip, "N of 13 packs" count; filters are in the URL so they can be shared.
- `/materials/<course>` — course page: sticky price bar, price + access card, "Gift this course", teaser image, what you get, numbered pack contents, related items.
- `/journal` (topic filter) and `/journal/<post>` (article with "More from the journal" sidebar).
- `/testimonials` — dark page with Written / Voice notes / Screenshots tabs, "Filter by service", voice-note player with waveform, 9:16 screenshot grid with a viewer, "Share your story" (WhatsApp / email).
- Header "Materials" dropdown: Courses, Meditations, Manuals, All Materials. The current page is highlighted.
- Course cards use the design's cover shapes: arch for meditations, folded page for manuals.
- `Layout`, `CourseCard`, `lib/slug.js` (+ tests).

### Changed
- Header, footer, hero "Explore the Materials", "View all materials", journal cards and "Read more testimonials" now open those pages.
- Course and journal pop-ups replaced by the pages above.

## [1.1.0] — 2026-11-14
Brought the React site in line with the latest design export (`Arabic Font and Site Updates – Abir Diab Site.html`).

### Added
- "Stay connected" newsletter box, saving to a new `newsletter_subscribers` table (migration `0004_newsletter.sql`, insert-only for visitors).
- The 8 real testimonial screenshots (EN + AR) from the design export, in `public/images/testi-shot-*.png`.
- Paper-grain texture overlay, ornament divider after About, floating "✦ 1:1 Session" button on phones.
- Watch & Listen: dark panel, Instagram / YouTube / TikTok buttons, two video tiles that play the YouTube teaser in place (privacy-enhanced `youtube-nocookie`).
- Footer: four columns (brand + social, Explore, Offerings, Contact), payment badges, currency switch, policy links.
- `src/content/ui.json` for labels the design hard-coded; `Icons.jsx`.

### Changed
- Section order now matches the design: Workshops before Courses; newsletter before Contact.
- Header: "1:1 Session" button; currency switch moved to the footer; urgency bar shows the workshop date.
- Meditations: arched photo + sample list with play buttons.
- Workshops: image cards with date badge, scarcity dot, price and full-width "Discover More".
- Courses: design card (badge, type tag, teaser play button, item count, category); home shows 8 with "View all materials" (filters appear in the full view).
- Journal: 2×2 card grid. Testimonials: dark section, group photo, four featured quotes, "Read more testimonials" expands the full tabbed view.
- About: the timeline (not in the design) removed. FAQ: first answer open by default.
- Build splits React and Supabase into their own cached files (no more >500 kB chunk warning).

## [1.0.0] — 2026-11-14
First version of the rebuilt project.

### Added
- React 18 + Vite + Tailwind 3 public site: hero, stats, marquee, about, services, 1:1 sessions, meditations/watch, courses & materials (filter, detail, pack list), live workshops, journal reader, testimonials (written / screenshot / voice), FAQ, contact, footer, privacy and refund pages.
- English / Arabic with full RTL, language remembered per visitor.
- React admin at `/admin` (code-split, `noindex`): Supabase login, add / edit / delete, show-hide, reorder, side-by-side EN/AR fields, image / audio / PDF upload to the `media` bucket.
- Country-based pricing: IP country detection, live USD rates cached 24 h, clean rounding, currency switch, "approximate, charged in USD" notes, USD fallback.
- Course "pack contents" stored in the database (`pack_items`, `has_teaser`) with an admin editor (migration 0002).
- Optional admin allow-list (migration 0003).
- Bundled fallback content so the site works without a database connection.
- Free-video embed support for Bunny Stream (`VITE_BUNNY_LIBRARY_ID`).
- Unit tests (pricing, admin form logic), ESLint, GitHub Actions CI.
- Complete documentation set (`docs/`), ADRs, handoff.

### Changed
- Past workshops are hidden automatically.
- Fonts self-hosted instead of embedded base64 in a 3 MB bundle.
- Booking / unlock / reserve buttons open WhatsApp with a pre-filled message.

### Removed
- Fake "Site admin" mode (hard-coded password, browser-only edits).
- Sample cart / checkout / booking / account demos (stored nothing; see [ROADMAP](docs/ROADMAP.md)).
- Fixed-rate currency table and time-zone country guessing.

### Known gaps
See [HANDOFF.md](HANDOFF.md): logged-in admin flows not yet exercised, migration 0002 not applied to the live DB, testimonial screenshots missing.
