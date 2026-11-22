# Launch checklist (do these in order; tick each one)

Where you see "ask Claude", paste the step and what you see on screen and I will walk you through it.

## 1. The server
- [ ] The Django backend runs on a real server (not your laptop) with PostgreSQL, `DEBUG=False`, a long `SECRET_KEY` (50+ random characters), and `ALLOWED_HOSTS` set to the server's address.
- [ ] `SITE_URL` / `SITE_URLS` = the real website address. `API_URL` = the real address of this server. Both start with `https://`.
- [ ] The folder for uploaded files (`backend/data/`) is on a disk that survives restarts, and the database has **daily backups** switched on.
- [ ] `python manage.py migrate` has been run on the real database.
- [ ] Your own admin account exists: `python manage.py make_admin owner@email.com --password "..."` (do the same for Abir). Use a new password, not one you used while testing.

## 2. The website (front end)
- [ ] Build with `VITE_API_URL=https://your-api-address/api` and `VITE_SITE_URL=https://your-site-address`.
- [ ] In `frontend/public/_headers`, the `connect-src` line must contain your API address (for example `https://api.abirdiab.com`). Add it, or the browser blocks every call. The old Supabase address can be removed.
- [ ] After it is live, test the card form, a video and Google sign-in; a security header that is too strict stops them silently.

## 3. Card payments (Paymob)
- [ ] Paymob **test** keys in `.env` (`PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_INTEGRATION_IDS`, plus EITHER `PAYMOB_HMAC_SECRET` OR `PAYMOB_API_KEY`). The integration's currency must match "Payment currency" in Admin > Booking settings.
- [ ] Make a test payment with Paymob's test card. Check: the order appears as **Paid** in the admin screen, and Paymob's dashboard shows the callback arrived.
- [ ] Then switch to the **live** keys, make one small real payment, and refund it by hand in Paymob.
- [ ] Admin > Booking settings: **Test payments OFF**, **Take card payments ON**, a real session price, real free times, real workshops with joining links.

## 4. Video calls (Zoom) and emails
- [ ] `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` set. Book a test session and check that its own Zoom link appears.
- [ ] `RESEND_API_KEY` and `MAIL_FROM` set, and the sending domain verified in Resend (add the SPF and DKIM records it shows you at your domain provider).
- [ ] Admin > Settings: emails switched **on**. A real confirmation arrived in a Gmail inbox **and** an Outlook inbox, not in spam.

## 5. Scheduled jobs (reminders, gift emails, cleanup)
- [ ] `CRON_SECRET` set to a long random text.
- [ ] Something calls the jobs every 5 minutes. Either `python manage.py run_jobs` from the server's scheduler (cron), **or** an external scheduler calling `POST https://your-api-address/api/fn/cron` with the header `x-cron-secret: <your CRON_SECRET>`.
- [ ] Check it runs: the answer lists `purged`, `reminders`, `gifts`, `cleaned`. Book a workshop starting within 2 hours with a joining link and see the reminder email arrive.

## 6. Optional: codes by phone, Google sign-in
- [ ] Codes by SMS / WhatsApp: Twilio Verify keys (`TWILIO_*`), then switch on "require phone verification" in Admin > Booking settings.
- [ ] Email codes work with no extra setup: switch on "require email verification" if wanted.
- [ ] Google sign-in: create the OAuth client (see `.env.example`), set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, add `<API_URL>/api/auth/google/callback` as an authorised redirect address, then switch on Google sign-in in Admin > Settings.

## 7. Last checks
- [ ] Delete all test orders and test accounts (Admin > Orders; test accounts through the Django admin at `/admin/` on the server).
- [ ] Admin > Settings shows every connection as connected.
- [ ] You tried, on a phone and in Arabic: a free course, a paid course, a 1:1 session, a workshop, a gift (both ways). Everything arrived by email.
- [ ] Abir has the admin guide (`frontend/docs/ADMIN_GUIDE.md`).
- [ ] Any key or password that was ever pasted in a chat, email or screenshot is replaced with a new one.
