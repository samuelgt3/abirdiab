# ADR 0003 — One USD base price, auto-converted per visitor

- **Status:** accepted (user's choice) · **Date:** 2026-11-14

## Context
Visitors come from Egypt, the Gulf and elsewhere. The first version used three fixed rates (USD/EGP/AED) and guessed the country from the
browser time zone. Egyptian pound rates move quickly; time zones mislabel travellers.

## Decision
Store only `price_usd`. Detect the country (api.country.is) and fetch live rates (open.er-api.com), cache rates 24 h, round to a clean
number, let the visitor override the currency, and state that prices are approximate and charged in USD. Fall back to USD on any failure.

## Consequences
+ The client manages one number per item. No stale rates in the database.
+ Works without a server or API keys.
− Two third-party calls from the visitor's browser; free services can change terms.
− Displayed local price is informational. Actual charge is USD, which can differ from what a local card shows after the bank's conversion.
Alternative if this proves confusing: store explicit prices per currency per item (more admin work, fully predictable).
