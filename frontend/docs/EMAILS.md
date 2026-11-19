# Emails

Two emails are built and deployed. **They send nothing until you add an email provider key** (steps below); until then bookings work normally and no email goes out.

| Email | When | Function |
|---|---|---|
| **Booking confirmation** ("Thank you, here is your booking") | The moment someone books a session, workshop seat or course. English or Arabic, matching the language they used. | `booking-email` |
| **Gift link for the receiver** ("X sent you a gift") | When a "send it to them" gift is paid (checked every 5 minutes). Gift-card gifts are not emailed: the sender shares the link. | `send-reminders` |
| **Joining link** | 2 hours before a paid session or workshop starts (only if the customer chose email and Abir has pasted the link). | `send-reminders` |

WhatsApp delivery of the link is **not** automatic yet; those customers see the link on their booking page from 2 hours before.

## One-time setup (about 15 minutes)

1. Create a free account at <https://resend.com>, add and verify your domain (e.g. `abirdiab.com`), and create an **API key**.
2. In Supabase → **Edge Functions → Secrets**, add:
   | Secret | Example |
   |---|---|
   | `RESEND_API_KEY` | the key from Resend |
   | `MAIL_FROM` | `Abir Diab <bookings@abirdiab.com>` |
   | `SITE_URL` | `https://www.abirdiab.com` |
   | `CRON_SECRET` | any long random text (needed only for the 2-hour email) |
3. Booking confirmations now work. Make a test booking with your own email and check your inbox.
4. For the **2-hour joining-link email**, run this once in Supabase → **SQL Editor** (replace `PASTE_YOUR_CRON_SECRET` with the same text you used in step 2):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('send-reminders', '*/5 * * * *', $$
  select net.http_post(
    url     := 'https://tiahqrrchxvhffynlvrl.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type":"application/json","x-cron-secret":"PASTE_YOUR_CRON_SECRET"}'::jsonb,
    body    := '{}'::jsonb);
$$);
```

To stop it later: `select cron.unschedule('send-reminders');`

## Good to know
- Each booking is emailed once (`orders.thanks_sent_at`); each joining link once (`orders.join_sent_at`).
- If Abir has not pasted the link when the 2-hour mark arrives, nothing is sent; the next 5-minute run tries again until 12 hours after the start.
- Without a verified domain, Resend only lets you send to your own address (fine for testing, not for customers).
- Wording lives in `supabase/functions/_shared/emails.ts` and is tested in `src/lib/emails.test.js`.
- After editing the wording, redeploy the functions (ask your developer, or ask Claude).
