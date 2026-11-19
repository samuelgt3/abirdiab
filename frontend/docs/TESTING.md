# Testing

## Automated (`npm test`, Vitest)
| File | Covers |
| --- | --- |
| `src/lib/pricing.test.js` | rounding steps, USD fallback when rates are missing, free stays free, country → currency, Arabic digits |
| `src/admin/schema.test.js` | pack-contents text ⇄ JSON round trip, bad-line errors |
| `src/admin/csv.test.js` | CSV export: quoting, formula neutralisation (=,+,-,@) |
| `src/admin/payload.test.js` | form values → database payload (required fields, numbers, lists, dates) |
| `src/lib/slug.test.js` | URL slugs: clean, unique for every bundled course/post, reversible |
| `src/lib/newsletter.test.js` | email validation; no network call for bad input; graceful error without a database |

`npm run check` = lint + tests + production build. CI runs it on every push (`.github/workflows/ci.yml`).

Not automated (yet): component rendering and end-to-end flows. When the shop is added, add Playwright tests for checkout.

## Manual test script (≈10 min) — run before each release
**Public site**
1. `npm run dev`, open `/`. Console has no errors.
2. Scroll all sections; every header link works (Materials dropdown included) and the current page is highlighted.
3. `/materials`: search "pendulum" (2 results), each type chip, the free chip; reload keeps the filter. Open a card → course page (price bar, pack contents, related); "Unlock Full" opens WhatsApp with the title.
4. Workshops: only future dates show; open one; "Book now" opens WhatsApp with the title pre-filled.
5. `/journal`: topic chips; open a post; sidebar links switch posts; Back returns to the list.
6. `/testimonials`: each tab; "Filter by service"; voice transcript toggle; screenshot opens large.
6. Header: Arabic toggle (layout mirrors, text right-aligned), refresh keeps Arabic; currency switch changes every price; FAQ opens/closes.
7. Resize to 375 px: no sideways scroll, menu works, modals fit.
8. Offline test: DevTools → Network → block `supabase.co`, reload → bundled content still shows.

**Admin** (needs a real login)
1. Wrong password shows an error; right one shows the sections.
2. Per table: add a *test* item → appears in the list and (if Visible) on the site → edit → hide → reorder → delete.
3. Upload an image and an audio file; URL fills in; preview shows.
4. Courses: edit a pack list with a deliberately bad line (`x | y`) → friendly error, nothing saved.
5. Log out; `/admin` shows login; try reading `/rest/v1/courses?published=eq.false` with only the anon key → empty (RLS).

**Security spot checks:** see the checklist in [SECURITY.md](SECURITY.md).

## What was verified so far
See "Verified in this session / NOT verified" in [../HANDOFF.md](../HANDOFF.md). In short: automated tests pass, public site verified in a real browser against the live database; the logged-in admin flows still need to be run by someone with the password.
