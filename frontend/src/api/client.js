/**
 * Every api/* module in this folder exposes async functions with the shape
 * a real backend would have (verbs like `getCourses`, `login`, `createBooking`),
 * so that swapping the mock implementation for real HTTP calls later is a
 * change inside these files only — components and contexts never touch
 * localStorage or mock data directly.
 *
 * To point this app at a real Django REST backend later:
 *   1. Set VITE_API_BASE_URL (e.g. in a .env file) to the API root,
 *      e.g. https://api.abirdiab.com/api
 *   2. Replace each mock function body in this folder with a `request(...)`
 *      call below. Suggested REST shape (DRF-style, trailing slashes):
 *        GET    /courses/                 -> list courses
 *        POST   /courses/                 -> create course        (admin)
 *        PATCH  /courses/:id/             -> update course        (admin)
 *        DELETE /courses/:id/             -> delete course        (admin)
 *        GET    /testimonials/            -> list testimonials
 *        POST   /testimonials/            -> add testimonial      (admin)
 *        PATCH  /testimonials/:id/        -> edit testimonial     (admin)
 *        DELETE /testimonials/:id/        -> delete testimonial   (admin)
 *        POST   /auth/signup/             -> {name,email,password} -> user
 *        POST   /auth/login/              -> {email,password}      -> user
 *        POST   /auth/logout/
 *        GET    /account/purchases/       -> current user's purchased course ids
 *        POST   /bookings/                -> {context,date,time,name,phone,email}
 *        POST   /checkout/                -> {courseIds, payment}  -> purchase receipt
 *        POST   /newsletter/subscribe/    -> {email}
 *   3. Swap session-cookie or bearer-token auth into `request()` as needed
 *      (Django REST + SessionAuthentication needs the CSRF header below;
 *      TokenAuthentication/JWT would add an Authorization header instead).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const USE_MOCK_API = !BASE_URL;

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getCsrfToken() ? { 'X-CSRFToken': getCsrfToken() } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail || `Request to ${path} failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Simulates real network latency so loading states behave the same way
 * once this is swapped for genuine `fetch` calls. */
export function mockDelay(value, ms = 120) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
