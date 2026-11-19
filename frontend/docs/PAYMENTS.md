# Card payments with Paymob

Status: **built and deployed. Test mode is ON** (pretend payments, no money) until the Paymob keys are added.

## How it works — pay first, book after
```
Visitor ── "Proceed to payment" ──▶ Edge Function paymob-checkout
        ──▶ begin_checkout() (database): checks + prices everything (several sessions = one total),
            holds the times/seat for 30 minutes (a hold has no personal data)
        ──▶ creates a Paymob payment for the TOTAL with the booking details inside it (signed by us)
        ──▶ the window shows Paymob's embedded card form on the "Payment" step (the visitor never leaves the site)
Paymob  ──▶ Edge Function paymob-webhook ── Paymob's signature AND our own signature checked ──▶ finalize_paid_order()
            creates the PAID order(s), all or none. A failed or abandoned payment creates nothing.
Window  ◀── waits for the order to appear as paid (up to ~30 s), then shows the confirmation (and the session link)
```
- **Test mode:** while no `PAYMOB_SECRET_KEY` is installed and Admin > Settings > "Test payments" is on, the card step shows a clearly
  marked pretend payment (`TestCardForm.jsx` + Edge Function `test-payment`). It books for real but takes no money.
  **Switch it off before the site is public.** Adding the Paymob secret key switches it off automatically.
- Several 1:1 sessions are paid with one payment; each becomes its own booking.
- Nothing is stored as an order until it is paid (only an expiring hold with no name, email or phone).
- Card numbers are typed **only** into Paymob's own form. Our code and database never see them.
- Only the signed webhook can create a paid order. The return page and the browser cannot.
- The same Paymob transaction can't be counted twice (stored once, by its Paymob id). A wrong amount, or a time taken meanwhile,
  creates no order (the latter is flagged `needs_refund` in `payment_events`).
- Prices stay in **USD**. At payment time they're converted to the **charge currency** (default EGP) at that day's rate, rounded **up**.
- **Unverified until a real test payment is made:** that Paymob returns our booking details in its callback
  (`obj.payment_key_claims.extra`). If it does not, a payment would arrive with no booking (`payment_events` outcome `unknown_order`).
- There is no cancel, reschedule or refund option on the website, by design (see the Refund Policy); refunds are handled by hand in Paymob.
- The form is Paymob's Pixel component, pinned to version 1.2.10 (`src/components/checkout/PaymobPixel.jsx`).

## Step 1 — get the keys from Paymob (business owner)
In the Paymob dashboard:
1. **Settings → API Keys**: copy the **Secret Key**, the **Public Key** and the **HMAC** secret.
2. **Settings → Payment Integrations**: note the **Integration ID** of each *online* method to offer (e.g. card). Its currency must
   match the charge currency. Use the **test** IDs and test keys first.

## Step 2 — put them in Supabase (never in the website code, never in chat or email)
Supabase → project `abir-diab-site` → **Edge Functions → Secrets → Add new secret**:

| Name | Value |
| --- | --- |
| `PAYMOB_SECRET_KEY` | Secret Key |
| `PAYMOB_PUBLIC_KEY` | Public Key |
| `PAYMOB_HMAC_SECRET` | HMAC secret |
| `PAYMOB_INTEGRATION_IDS` | Integration ID(s), comma separated, e.g. `4569876` |
| `SITE_URLS` | the website address(es), comma separated, e.g. `https://www.abirdiab.com,http://localhost:5173` (the first one is used if a request comes from elsewhere) |
| `PAYMOB_BASE_URL` | only outside Egypt: `https://ksa.paymob.com`, `https://uae.paymob.com` or `https://oman.paymob.com` |

Then in the Paymob dashboard, for each integration, you can leave the callback URLs empty — the site sends them with every payment
(`https://tiahqrrchxvhffynlvrl.supabase.co/functions/v1/paymob-webhook`). If Paymob asks for a "Transaction processed callback",
use that address.

## Step 3 — test, then switch on
1. `/admin` → **Booking settings** → set the charge currency → tick **Take card payments on the website** → Save.
2. On the site, buy a cheap item; on the Payment step type a Paymob **test card** (Paymob's docs list them). Also try the 3-D Secure screen.
3. Check: the window shows "Payment received", and in `/admin` → Bookings & orders the order shows **Paid**, the card charge and
   the Paymob transaction number.
4. Replace the test keys and integration IDs with the **live** ones in Supabase Secrets. Do one small real payment and refund it in
   Paymob.

To pause card payments at any time, untick the box in Booking settings. Bookings still work; Abir sends payment links by hand.

## Troubleshooting
| What you see | Cause |
| --- | --- |
| "The payment page is not available right now" | Switch is off, a secret is missing (`not_configured`), the integration ID's currency doesn't match, or the exchange-rate service is down. Supabase → Edge Functions → paymob-checkout → Logs shows which. |
| The card form shows an error box instead of card fields | The payment code was rejected: wrong key pair, test keys mixed with live Integration IDs, or the Integration ID's currency differs from the charge currency. Supabase → Edge Functions → paymob-checkout → Logs |
| Paid on Paymob but the order is still "Awaiting payment" | The webhook didn't arrive or failed the signature check: check the HMAC secret, then the paymob-webhook logs. A wrong secret returns 401 and Paymob retries. |
| Admin note "paid … but … was expected" | Paymob reported a different amount or currency. Check in Paymob before confirming. |
| "Phone number is required" on paid items | Paymob needs a phone number for every card payment. |

## Files
- `supabase/functions/paymob-checkout/index.ts`, `supabase/functions/paymob-webhook/index.ts`, `supabase/functions/_shared/paymob.ts`
- `supabase/migrations/0007_paymob.sql` (settings switch + currency, charge fields, `payment_events`, `record_payment()`, `order_status()`)
- Front end: `src/lib/orders.js` (`startPayment`, `getOrderStatus`, `waitForPaid`), `src/components/checkout/CheckoutModal.jsx` (Payment step), `src/components/checkout/PaymobPixel.jsx`, `src/pages/PayPage.jsx` (`/pay`), `src/pages/PaymentReturnPage.jsx` (`/payment/return`, used only by the hosted-page fallback)
- Tests: `src/lib/paymob.test.js` reproduces Paymob's documented HMAC example.

Redeploy a function after editing it: `supabase functions deploy paymob-checkout` and
`supabase functions deploy paymob-webhook --no-verify-jwt` (the webhook must stay without JWT; its HMAC is the authentication).
