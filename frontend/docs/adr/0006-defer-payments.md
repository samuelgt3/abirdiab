# ADR 0006 — Payments, booking and accounts deferred; WhatsApp in the meantime

- **Status:** accepted for v1 · **Date:** 2026-11-14

## Context
The design's cart, checkout, booking, account and "Site admin" screens were demonstrations: nothing was stored and no payment processed.
The "Site admin" used a hard-coded password in client code and only edited one visitor's own browser storage, conflicting with the real admin.

## Decision
Do not port the demos. Replace them with WhatsApp links pre-filled with the item or workshop name (the business already runs on
WhatsApp). Remove the fake admin mode entirely. Build the real thing later ([ROADMAP.md](../ROADMAP.md)).

## Consequences
+ No fake features that look real; no payment-security obligations on day one; site can launch now.
− Manual fulfilment for every sale until payments are built.
− Visitors cannot self-serve; conversion may be lower than with checkout.
