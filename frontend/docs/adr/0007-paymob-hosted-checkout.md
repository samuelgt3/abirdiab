# ADR 0007 — Paymob checkout (embedded form), webhook as the source of truth

- **Status:** accepted (owner chose Paymob) · **Date:** 2026-11-14

## Context
The business is in Egypt and serves Egypt and the Gulf. Customers need to pay by card on the site. We must never collect or store
card numbers ourselves.

## Decision
- Use Paymob's **Intention API**. The customer pays in Paymob's embedded **Pixel** card form shown inside our own booking window
  (so payment stays on the site); Paymob's hosted Unified Checkout page is the fallback. The secret key lives only in Supabase Edge
  Function secrets; the browser only gets the public key and a one-time payment code.
- An order is marked paid **only** by the HMAC-verified `paymob-webhook`, in one database call (`record_payment`) that is idempotent
  on Paymob's transaction id and checks the amount and currency against the order.
- Prices stay in USD; the charge currency is a setting (default EGP). Conversion happens server-side at payment time and is stored.
- A kill switch (`site_settings.payments_enabled`) lets the owner turn card payments off without a deploy.

## Consequences
+ No card data in our systems; small PCI scope. Works for Egyptian and Gulf cards.
+ Payment state cannot be faked from the browser.
− The customer's bank may show a slightly different amount if their card is not in the charge currency (bank conversion).
− Depends on a free exchange-rate API at payment time; if it is down, payment cannot start (the booking is still saved).
− One `notification_url` per payment means the Supabase project URL must stay stable.
