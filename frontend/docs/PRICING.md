# Country-based pricing

All prices are stored **once, in US dollars** (`price_usd`). The site shows each visitor a converted, rounded, approximate price in
their local currency. Payment is always in USD. Code: `src/lib/pricing.js` (pure functions, unit-tested in `pricing.test.js`).

## How it works
1. **Currency** is decided in this order: the visitor's saved choice (`localStorage abir_cur`) → currency of the detected country → `USD`.
2. **Country detection**: `GET https://api.country.is/` → `{ "country": "EG" }`. Free, no key, CORS-enabled, 5 s timeout. It sees the visitor's IP (any web request does); nothing else is sent. Failure ⇒ USD.
3. **Exchange rates**: `GET https://open.er-api.com/v6/latest/USD` → `rates{}` (daily, free, no key). Cached in `localStorage abir_rates_v1` for **24 h**; if a refresh fails the stale cache is used; if there is none, USD.
4. **Convert + round** (`niceRound`): the amount grows its step with size so prices look deliberate:

   | Amount | Step | Example |
   | --- | --- | --- |
   | < 10 | 0.5 | 2.74 → 2.5 |
   | < 100 | 5 | 33.2 → 35 |
   | < 1 000 | 10 | 446 → 450 |
   | < 10 000 | 50 | 2 618 → 2 600 |
   | ≥ 10 000 | 500 | |

   Free (0) stays free.
5. **Format** with `Intl.NumberFormat` (`$ € £` for majors, codes such as `EGP`/`AED` otherwise). Arabic uses Western digits (`ar-u-nu-latn`) like the original design.
6. The header has a **currency switch** (USD, EUR, GBP, EGP, AED, SAR + the detected one). The choice is remembered.
7. The footer and each detail view say: *"Prices shown in X, approximate; charged in USD."*

## Country → currency
Defined in `COUNTRY_CURRENCY`: EG→EGP, AE→AED, SA→SAR, KW→KWD, QA→QAR, BH→BHD, OM→OMR, JO→JOD, GB→GBP, CA→CAD, AU→AUD, US→USD and
eurozone countries→EUR. Anything else → USD. Add a line to support another country. Only currencies present in the rates response work.

## Changing the behaviour
| Want | Change |
| --- | --- |
| Different rounding | `niceRound` |
| More currencies in the dropdown | `OFFERED` |
| Swap the rate / country provider | `detectCountry` / `loadRates` (keep returning the same shapes) |
| Stop detecting, always USD | remove the effect in `SiteContext.jsx`, or set the default currency |

## Why not fixed rates?
The first design hard-coded USD/EGP/AED rates and guessed the country from the browser time zone. Rates drift (EGP especially) and time
zones misclassify travellers. Live rates + IP country fix both with no server. See [ADR 0003](adr/0003-usd-base-price-auto-convert.md).

## Privacy and reliability notes
- Two third-party calls happen in the visitor's browser. Mention them in the privacy policy if the client wants to be exhaustive.
- Free APIs can change or rate-limit. The site never breaks if they fail (USD). Before launch consider a paid/own source or a Supabase Edge Function proxy.
- When real payments are added, charge in USD (or Stripe's per-currency prices) — never trust the displayed converted figure.
