# Email and phone verification

## What is built

| Feature | Always on? | How it works |
|---|---|---|
| **Typo catcher** | Yes | When someone leaves the email box, "Did you mean layla@gmail.com?" appears with a one-click "Use it" (gmial.com, gmail.con, hotmial.com …). Only near-misses of big providers are flagged, so company addresses are never nagged. |
| **Email code** | Off until you switch it on | The customer gets a 6-digit code by email and types it before paying. Proves the address is real and theirs. |
| **Phone code (OTP)** | Off until you switch it on | The customer picks **SMS** or **WhatsApp**, gets a 6-digit code and types it. Only asked when they gave a phone number. |

Switches: **Admin → Booking & payments → "Verify customers' email and phone"**.
Signed-in customers whose confirmed account email is the one they typed skip the email code.
Codes expire after 10 minutes, allow 5 wrong tries, and limit 3 codes per address or number per 10 minutes (10 per visitor per hour).
The database refuses any order without a valid, unused verification, so it cannot be skipped from outside the website.

> ⚠️ Do **not** switch a verification on before its keys below are added. The customer would be asked for a code that cannot be sent, and could not book.

## Switching on email codes
Needs the same Resend setup as the booking emails: see [EMAILS.md](EMAILS.md) (`RESEND_API_KEY`, `MAIL_FROM`). Then switch on "Verify email with a code".

## Switching on phone codes (Twilio Verify)
1. Create a Twilio account → **Verify → Services → Create new**. Name it "Abir Diab".
2. In the service settings, enable the **SMS** channel and, if you want it, the **WhatsApp** channel.
3. In Supabase → **Edge Functions → Secrets** add:

   | Secret | Where to find it |
   |---|---|
   | `TWILIO_ACCOUNT_SID` | Twilio Console home |
   | `TWILIO_AUTH_TOKEN` | Twilio Console home (keep secret) |
   | `TWILIO_VERIFY_SID` | the Verify service you made (starts with `VA…`) |
4. Test with your own number first (a Twilio trial account can only text numbers you verify in Twilio), then switch on "Verify phone number with a code".

## Which provider? (recommendation)
**Recommended: Twilio Verify** (already wired in). It makes, sends, retries and checks the codes itself, has built-in fraud protection against fake-number abuse, and offers both SMS and WhatsApp, which matters for Egypt and the Gulf where WhatsApp is the most reliable channel.

Price (from Twilio's pricing page when this was written): **$0.05 per successful verification**, plus the delivery fee. In the US that is about $0.008 per SMS, or about $0.003 to $0.015 per WhatsApp message. **Egypt and Gulf SMS fees are higher than the US ones and I did not look them up**: check Twilio's SMS pricing page for Egypt before you launch. So expect roughly 6 to 10 cents per verified customer.

| Provider | Good for | Notes |
|---|---|---|
| **Twilio Verify** (chosen) | Small business, quick start, SMS + WhatsApp | Pay as you go, no contract, best documentation. Free trial credit. |
| **Vonage Verify** | Alternative with similar price | Also about $0.05 per verification, SMS/voice/WhatsApp. Would need a small code change. |
| **Infobip** | Larger volume, direct operator routes in Egypt/MENA | Contract-style pricing and sales process; overkill for now. |
| **Regional providers** (e.g. Unifonic, Taqnyat) | Local sender names and local pricing in the Gulf | I did not check their current terms. Worth a quote if volume grows. |

Cost-saving tip: default customers to **WhatsApp** if Twilio's WhatsApp fee for your country is lower than SMS.

## Where things live
- `supabase/functions/send-code`, `check-code`: send and check codes (deployed).
- Table `verifications`: one row per code (email codes are stored as a hash, never in plain text).
- `place_order()` in the database: the gate; migration `0012_verification.sql`.
- `src/lib/emailTypos.js`: the typo catcher (tested in `emailTypos.test.js`).
