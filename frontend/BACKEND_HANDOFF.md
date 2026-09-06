# Backend Handoff — Abir Diab Site

This document is for the developer who will build the real backend behind
this frontend. The frontend (`site/`) is a complete, working React app.
Every place it currently fakes a backend (booking, checkout/payment, auth,
admin content editing) is isolated behind one folder — `src/api/` — so
building the backend is a matter of implementing the endpoints below and
swapping the mock bodies in that folder for real `fetch` calls. No
component or context talks to `localStorage` or mock data directly.

The stated target backend is **Django + Django REST Framework (DRF)**, so
the endpoint shapes and the `backend-reference/` folder alongside this
file follow Django/DRF conventions (trailing slashes, session auth This
doesn't lock you in — any backend that implements the same JSON contract
works.

## 1. How the frontend calls the backend today

Every function in `src/api/*.js` is written as an `async` function with
the same signature it would have against a real API. Right now each one
checks `USE_MOCK_API` (true whenever `VITE_API_BASE_URL` is unset) and
either:
- reads/writes `localStorage` (mock), or
- calls `request(path, options)` from `src/api/client.js` (real)

**To go live:** set `VITE_API_BASE_URL` (e.g. in `site/.env`) to your API
root, and delete the mock branch in each `src/api/*.js` file, leaving only
the `request(...)` call. That's the entire frontend-side change.

`request()` (in `src/api/client.js`) already:
- sends `credentials: 'include'` (cookies) for Django `SessionAuthentication`
- reads Django's `csrftoken` cookie and sends it as `X-CSRFToken`
- sends/expects JSON bodies

If you'd rather use token/JWT auth instead of Django sessions, change
`request()` to attach an `Authorization` header instead — it's the only
place that needs to change.

## 2. API contract

All paths are relative to `VITE_API_BASE_URL`. Trailing slashes shown are
DRF convention — keep them consistent with whatever you configure.

### Courses

| Method | Path | Body | Response | Used by |
|---|---|---|---|---|
| GET | `/courses/` | — | `Course[]` | `api/courses.js: getCourses()` |
| POST | `/courses/` | `Course` (no id) | `Course` | admin "+ Add item" |
| PATCH | `/courses/:id/` | partial `Course` | `Course` | admin lock/unlock toggle |
| DELETE | `/courses/:id/` | — | 204 | admin remove |

The mock currently does one `PUT /courses/bulk/` that replaces the whole
list (see `api/courses.js: saveCourses()`) — that's a shortcut for
`localStorage`, not something to implement server-side. Build the four
REST endpoints above instead; they map directly onto
`CoursesContext.jsx`'s `addCourse` / `removeCourse` / `toggleLock`.

**`Course` shape** (see `src/data/default-courses.js` for real sample data):
```jsonc
{
  "id": 3,
  "category": "E-Course",          // English category label
  "categoryAr": "دورة إلكترونية",   // Arabic category label
  "type": "Video",                  // "Video" | "Audio" | "PDF"
  "title": "Foundations of Energy Healing",
  "titleAr": "أساسيات الشفاء بالطاقة",
  "desc": "Short one-line description (card view)",
  "descAr": "...",
  "full": "Longer description shown in the detail modal",
  "fullAr": "...",
  "image": "images/pendulum-set.jpg",   // path under site's /public/images/
  "price": 49,                          // dollars, ignored when free:true
  "free": false,
  "downloadable": true,                 // true: "Downloadable", false: "Portal only"
  "meta": "8 lessons · 3h 40m",         // shown as a badge (lesson count / duration / page count)
  "metaAr": "...",
  "badge": "Lesson 1 free",             // top-left preview badge on the card
  "badgeAr": "...",
  "locked": true,                       // cosmetic only today — see §4
  "whatYouGet": ["8 video lessons streamed through the portal", "..."],
  "whatYouGetAr": ["...", "..."]
}
```

### Testimonials

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/testimonials/` | — | `Testimonial[]` |
| POST | `/testimonials/` | `Testimonial` (no id) | `Testimonial` |
| PATCH | `/testimonials/:id/` | `{ name? , quote? }` | `Testimonial` |
| DELETE | `/testimonials/:id/` | — | 204 |

Same note as courses: the mock does one bulk save
(`api/testimonials.js: saveTestimonials()`); implement the four REST
endpoints instead.

**`Testimonial` shape:**
```jsonc
{ "id": 1, "name": "Rana M.", "role": "1:1 Sessions", "quote": "...", "gradient": "linear-gradient(135deg,#DD8452,#C1922F)" }
```
`gradient` is a decorative CSS gradient string used for the avatar circle
(the frontend cycles through 4 fixed gradients in
`src/data/gradients.js` — you can either store the string itself per
row, or store an index 0-3 and have the frontend look it up; the mock
stores the string).

There is no language field: the client edits/creates testimonials in
whichever language is active, and stored testimonials are shown as-is
regardless of language (that's a deliberate quirk carried over from the
original design, not a bug — see `TestimonialsContext.jsx`).

### Auth

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/signup/` | `{ name, email, password }` | `User` |
| POST | `/auth/login/` | `{ email, password }` | `User` |
| POST | `/auth/logout/` | — | 204 |
| GET | `/auth/session/` | — | `User` or 401/null |

**`User` shape:** `{ "name": "Jane Doe", "email": "jane@example.com" }`

The current mock **never checks the password** — it exists purely so the
checkout flow has an identity to attach purchases to. Real signup/login
should obviously do real password validation; the frontend doesn't care
what's inside `User` beyond `name`/`email`.

### Account / purchases

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/account/purchases/` | — | `number[]` (course ids the signed-in user owns) |

Purchases are granted by `/checkout/` (below), not written directly by
the frontend — `POST /account/purchases/` in `api/purchases.js` is a mock
implementation detail, not part of the real contract.

### Booking (1:1 sessions / workshop seats)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/bookings/` | see below | `{ zoomLink: string, ...echoed fields }` |

**Request body:**
```jsonc
{
  "context": "1:1 Session",   // or "Live Workshop Seat" — free text label, not an enum
  "date": "2026-09-10",       // ISO date, always tomorrow or later
  "time": "12:00",            // one of 10:00/12:00/14:00/16:00/18:00/20:00
  "name": "Jane Doe",
  "phone": "+20 100 000 0000",
  "email": "jane@example.com" // optional
}
```
The response needs a `zoomLink` (or whatever real meeting link) the
frontend displays and offers to send via WhatsApp/email. Real availability
checking against the requested date/time is **not implemented on the
frontend today** — the time slots are a fixed list shown regardless of
date (flagged in the original design audit; see `BookingModal.jsx`). If
you want real availability, that logic needs to move server-side and the
frontend's fixed slot list needs to become a real per-date query.

### Checkout

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/checkout/` | `{ courseIds: number[] }` | `{ purchases: number[] }` |

This is where real payment integration goes (Stripe, etc.) — today it's
an unvalidated card-number form that always succeeds
(`CheckoutModal.jsx`). A real implementation should:
1. Create a payment intent/charge with your payment provider using the
   authenticated user + cart total (computed server-side from `Course.price`,
   never trust a client-sent total).
2. On success, record the purchases against the user and return the
   updated purchase id list.
3. Return a real error the frontend can show if payment fails (the
   frontend doesn't currently handle a failure path — see §4).

### Newsletter

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/newsletter/subscribe/` | `{ email }` | 204 |

## 3. Admin / content editing

The footer "Site admin" toggle (password `abir2026`, hardcoded in
`AdminContext.jsx`) is a **sample-only** affordance from the original
design — it is not real security and must not ship as-is. Replace it
with a real check, e.g.:
- `GET /auth/session/` returns an `isStaff`/`role` field on `User`, and
  `AdminContext` gates on that instead of a client-side password, or
- a dedicated admin app (Django admin, or a separate internal tool) that
  writes courses/testimonials through the same REST endpoints above.

## 4. Known gaps carried over from the design (read before "fixing" these)

These are pre-existing characteristics of the approved design, not
frontend bugs — flagging them so the backend isn't built assuming
behavior the frontend doesn't have:

- **No payment failure path.** Checkout always reaches the success screen.
- **Booking time slots aren't tied to real availability** (see §2).
- **Cart is not persisted** — it's intentionally in-memory only
  (`CartContext.jsx`) and empties on reload, unlike language/user/purchases.
- **`locked` on a course is cosmetic** — the detail modal and Add-to-Cart
  button work regardless of `locked`. If you want real content gating,
  that check needs to move server-side (e.g. don't serve the real
  video/PDF/audio URL until `/account/purchases/` includes that course id).
- **Arabic journal posts have no long-form body** — only title/excerpt.
  That content was never written for the original design; journal posts
  are static frontend content (`src/i18n/en.js` / `ar.js`), not part of
  this API contract at all.
- **Courses-portal filter chip labels** ("Video"/"Audio"/"PDF"/"Free"/"Paid")
  are English-only in both languages by design.

## 5. Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API root, e.g. `https://api.abirdiab.com/api`. Unset = mock mode. |

## 6. Where everything lives

```
site/
  src/
    api/            <- the entire contract above, one file per concern
    context/        <- React state that calls api/*.js (Auth, Cart, Courses, Testimonials, Overlay/booking-checkout-auth-account)
    data/           <- static content: default courses, testimonials, EN/AR copy
    components/     <- one file per page section + Courses/, Journal/, modals/
```

`backend-reference/` (sibling to `site/`) has a starting-point Django/DRF
sketch (models, serializers, views, urls) matching the contract above —
it is a reference to save you typing, not a finished, tested backend.
