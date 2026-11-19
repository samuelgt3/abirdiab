# Full audit — 17 Nov 2026

Scope: database, security, front-end design/accessibility, user experience, wording, Arabic parity, performance/SEO.
Left out on purpose (need outside accounts): email (Resend), Paymob keys, Zoom, WhatsApp, phone/SMS.
Nothing was changed. Each item has a priority: **High** (fix before launch), **Medium**, **Low**.
Checked and passing: 31 test files / 151 tests, lint (0 warnings), production build, `npm audit` (0 vulnerabilities), no secrets in the code, no `dangerouslySetInnerHTML`, all external links use `rel="noopener"`, English/Arabic text files have identical keys (0 missing).

## 1. Database
| # | Priority | Problem |
|---|---|---|
| D1 | High | A customer can read the `admin_notes` column of their own orders through the API (the column is readable and the "own orders" rule allows the row). No notes exist yet, but anything Abir writes there later would be visible to that customer. Fix: remove the column from customer access (view or column privilege). |
| D2 | Medium | Leaked-password protection is off in Supabase Auth (Supabase advisor warning). One switch in the dashboard. |
| D3 | Medium | Test bookings by the owner and test emails (`guest-testN@example.com`) may still be in the live data; delete before launch. |
| D4 | Low | `send-reminders` is deployed but not scheduled; the repo copy and the deployed copy differ (6 h window only in the repo). |

## 2. Security
| # | Priority | Problem |
|---|---|---|
| S1 | High | Test payments are ON. While `payment_test_mode` is on and no Paymob secret is installed, **anyone** can complete a booking for free. Safe for now; must be switched off (and real keys added) at launch. The function does refuse to run once a real secret key exists. |
| S2 | Medium | No security headers. `public/.htaccess` only sets caching. Missing: Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/frame-ancestors, HSTS. (Cloudflare Pages needs a `_headers` file instead of `.htaccess`.) |
| S3 | Medium | `paymob-checkout` has no rate limit. Anyone can start many checkouts and hold 1:1 time slots / workshop seats for 30 minutes each, blocking real customers. |
| S4 | Medium | Edge Functions answer every origin (`Access-Control-Allow-Origin: *`). Harmless for public functions, but `setup-status` and `test-payment` should be limited to the site's own address. |
| S5 | Low | `test-payment` and `paymob-checkout` fall back to signing with the service key if `PAYMOB_HMAC_SECRET` is missing. Works, but one secret doing two jobs; prefer failing loudly. |
| S6 | Low | The one `document.write` (CourseView, opens a manual in a new window) writes server content into a window; make sure the content is escaped or switch to a Blob URL. |
| S7 | Low | Admin password still the one that was shared earlier. Change before launch. |

Good: RLS on every table, SECURITY DEFINER functions have a fixed `search_path`, guest access keys are stored hashed, send-code/check-code/signup-verified/delete-account have rate limits and single-use codes, `setup-status` is admin-only, the webhook checks Paymob's signature.

## 3. Front-end design and accessibility
| # | Priority | Problem |
|---|---|---|
| F1 | High | Colour contrast too low for text: gold on cream **2.7:1**, orange accent on cream **2.7:1**, gold on sand 2.4:1 (needs 4.5:1 for normal text). Used for 6 text spots. Light-grey text (`ink/30–50`, 11 places) is about 3:1. Fix: darker gold/accent for text only. |
| F2 | Medium | Image alt text and some labels are English-only (see Arabic section). |
| F3 | Medium | About 129 buttons have no `aria-label`; most have visible text, but icon-only ones (close, arrows, play, cart) need checking one by one. |
| F4 | Medium | Four places use text smaller than 12px (9–11px). Hard to read on phones. |
| F5 | Low | A full-screen "grain" overlay (z-index 999, blend mode) sits over the whole site; costs paint time on weak phones and gives little. |
| F6 | Low | Two floating buttons (cart and 1:1) plus the banner can crowd small phones; they are placed apart but there is no safe-area test on notched phones. |
| F7 | Low | The Admin panel is fixed English and left-to-right (by design for now). |

## 4. User experience
| # | Priority | Problem |
|---|---|---|
| U1 | High | The refund policy says "we'll do our best to find another time" for 1:1 sessions, but the site has no reschedule option by design. Decide: remove the sentence or say how (message/WhatsApp). |
| U2 | Medium | Free courses and free gifts still require an account (left on purpose earlier). It is the only place where the "no sign-up until you pay" promise does not hold. |
| U3 | Medium | A guest who clears the browser or switches device loses the saved access key; the only way back is the emailed link/sign-in with the same email. Until email is connected this is a dead end. The thank-you page says the links were emailed; that is only true after Resend is connected. |
| U4 | Medium | The calendar shows only booked/free; no message for "all full this month" beyond a generic line. |
| U5 | Low | Prices are visible only in the visitor's currency, but the card is charged in EGP; the confirm screen should say clearly which currency will appear on the card statement. |
| U6 | Low | Cart and checkout are separate paths; a signed-in visitor sees different confirm screens for single item vs cart. |

## 5. Unnecessary or outdated wording
| # | Priority | Problem |
|---|---|---|
| W1 | Medium | `checkout.payPending` says "Card payment opens here soon — you will not be charged now…" — wrong now that payments work. |
| W2 | Medium | `account.thanks.saved` says "Online card payment opens on this website soon…" — outdated. |
| W3 | Low | `account.gate.guestNote` says "verify your email and phone" — the old flow; unused. Delete. |
| W4 | Low | `account.thanks.session`: "(and in My bookings once you have an account)" is awkward given the new password screen. |
| W5 | Low | Long sentences that could be halved: `deleteWarn` (239 chars), `giftLinkNote`, `test.lead`. |
| W6 | Low | Unused text keys likely remain from earlier flows (needs a proper tool to list safely). |

## 6. Arabic (not applied or not matching English)
| # | Priority | Problem |
|---|---|---|
| A1 | High | 4 of 15 testimonials have no Arabic quote or name; Arabic visitors see English or blanks. |
| A2 | Medium | English-only image descriptions (About, Hero, Meditations, Sessions, Testimonials — 5 images) for screen readers. |
| A3 | Medium | English-only labels: "Menu", "Dismiss" (header), "Instagram/YouTube/TikTok" (fine as brand names). |
| A4 | Medium | The Admin panel is English only (known). |
| A5 | Low | Four extra Arabic plural keys (`days2`, `hours2`, `minutes2`, `summary.two`) have no English twin — fine (Arabic dual form), just noting. |
| A6 | Low | Prices/times use Western digits in Arabic by choice (`ar-u-nu-latn`); confirm that is wanted everywhere (emails too). |
| A7 | Low | Page titles/descriptions: all 13 pages have Arabic; no `hreflang` links, so Google cannot tell the two languages apart. |

Checked and fine: policies (privacy, refund, terms) exist in both languages; journal, courses, workshops, meditations have Arabic in the database; RTL uses logical properties (the only `left-1/2` uses are centred icons, correct in both directions).

## 7. Performance, SEO, code health
| # | Priority | Problem |
|---|---|---|
| P1 | High | No sitemap (`VITE_SITE_URL` not set) and the share image/`og:image` is built from that same variable, so social shares are broken until it is set. `robots.txt` has no sitemap line. |
| P2 | Medium | Single-page app: search engines get an empty page first. Only 26 "page copies" are generated; consider checking that each indexed page (courses, journal posts, workshops) has real text in its copy. |
| P3 | Medium | Main script 260 kB (89 kB gzipped) + supabase 229 kB + react 180 kB. Fine for desktop; slowish on weak phones. Admin is already split (97 kB). |
| P4 | Low | Images are 1.4 MB total but fine; 9 `<img>` without `loading` (hero/top ones are right to be eager, check the rest). |
| P5 | Low | Dependencies are one major version behind (React 18, Vite 5, Tailwind 3, Vitest 2). No known vulnerabilities; upgrade later, not before launch. |
| P6 | Low | Hosting not chosen yet: `.htaccess` is for cPanel; Cloudflare Pages needs `_redirects` + `_headers`. |

## Suggested order
1. Before launch (High): D1, S1, F1, U1, A1, P1.
2. Next (Medium): D2, D3, S2, S3, S4, W1, W2, A2, A3, F3, F4, U2–U4, P2, P3.
3. Whenever (Low): everything else.

## Status after fixes (17 Nov 2026)
**Fixed:** D1 (notes moved to an admin-only table), S2 (headers), S3 (checkout rate limit), F1 (see correction), F3 (labels checked), F4, F5, U1 + policy wording, W3, A2, A3, P6 (`_headers`, `_redirects`).
**Corrections to this report (found while fixing):**
- A1 was a false alarm: the 4 testimonials are screenshots that already have Arabic images and names.
- F1: the gold/orange text was on dark green (about 4:1), not on cream; made lighter. Grey helper text darkened.
- S6: the certificate window already escapes everything; nothing to fix.
- W1/W2: correct while card payments are closed; they only show then. Left as they are.
- U4: the calendar already says when no times are left.
- U5: not added, because you asked that prices are shown only in the visitor's currency.
- A7: the two languages share one address, so `hreflang` does not apply.
**Left on purpose / waiting on you or on outside accounts:** S1 (test payments stay ON until launch), S4 (CORS `*` is harmless for these functions; tighten once the real domain is known), S5 (test mode depends on that fallback), S7 + D3 (change admin password, delete test bookings), D2 (switch on leaked-password protection in Supabase Auth settings), D4 (needs email connected), U2 (free items need an account, as decided), U3 (needs email connected), P1 (set `VITE_SITE_URL` to the real address at build time: sitemap, robots sitemap line and share image then appear automatically), P2, P3, P5 (later).
