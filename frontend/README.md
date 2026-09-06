# Abir Diab Site

React (Vite) implementation of the `Abir Diab Site.dc.html` design from the
`project/` Claude Design handoff bundle in the repo root. This is a real,
buildable app — not the design prototype — recreated to match that design
pixel-for-pixel, with all interactive flows (booking, cart/checkout,
auth/account, admin editing, EN/AR language toggle) fully wired up.

## Running it

```
npm install
npm run dev      # dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Current data/backend: mocked, but Django-ready

Booking, checkout/payment, auth, and admin content-editing are **mocked**,
matching the original design exactly (no real payment provider, no real
password checking, WhatsApp/email links instead of real notifications).
All of that logic lives behind `src/api/*.js`, and every function there is
already shaped like a real REST call (`getCourses()`, `login()`,
`createBooking()`, `completeCheckout()`, etc.) backed today by
`localStorage`/in-memory state instead of `fetch`.

To connect a real Django (DRF) backend later:

1. Set `VITE_API_BASE_URL` to the API root (e.g. in a `.env` file).
2. In each `src/api/*.js` file, replace the mock branch with the
   `request(...)` call that's already stubbed in next to it — the intended
   endpoint shape for each is documented in `src/api/client.js`.
3. Swap session-cookie or token auth into `request()` as needed (a CSRF
   header for Django's `SessionAuthentication` is already wired in).

No component or context talks to `localStorage` or mock data directly —
they all go through `src/api/*.js`, so this swap doesn't touch UI code.

## Structure

- `src/data/` — the site's content: courses, testimonials, EN/AR copy
  (extracted verbatim from the original design file).
- `src/i18n/` — `EN`/`AR` translation tables and the `LanguageContext`
  that switches fonts/direction/copy.
- `src/api/` — the mock-but-REST-shaped data layer described above.
- `src/context/` — cross-cutting state: language, auth, cart, courses,
  testimonials, admin mode, and the shared overlay/modal state (booking,
  checkout, auth, account, course detail, journal reader, courses portal).
- `src/components/` — one component per page section, plus `Courses/`,
  `Journal/`, and `modals/` subfolders for the more involved pieces.

## Known content gaps carried over from the design

- Arabic journal posts have no full article body (only title/excerpt) —
  the original design never had this copy written.
- The courses-portal filter chip labels ("Video", "Audio", "PDF", "Free",
  "Paid") are English-only in both languages — that's how the source
  design shipped.
- The footer "Site admin" password (`abir2026`) and the mock checkout/auth
  are sample-only, not real security — see the Django note above.
