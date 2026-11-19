import { supabase } from './supabase.js';
import { isEmail } from './newsletter.js';

export { isEmail };

/**
 * Card payments go through Paymob's hosted page. They are switched on by the admin (site_settings.payments_enabled)
 * once the Paymob secrets are set in Supabase. While off, orders are saved and Abir sends a payment link.
 */
export const DEFAULT_SETTINGS = {
  payments_enabled: false,
  payment_test_mode: false,
  emails_enabled: false,
  google_signin_enabled: false,
  require_email_verification: false,
  require_phone_verification: false,
  payment_currency: 'EGP',
  session_price_usd: null,
  session_length: '60 min',
  session_length_ar: '60 دقيقة',
  booking_times: ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
  booking_timezone: 'Asia/Dubai',
  booking_days_ahead: 60,
  booking_weekdays: [0, 1, 2, 3, 4, 5, 6],
};

export async function loadSettings() {
  if (!supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase.rpc('public_settings'); // a trimmed copy: the settings table itself is admin-only
  if (error || !data) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...data };
}

// ------------------------------------------------------------------ validation
export const phoneDigits = (v) => String(v || '').replace(/\D/g, '');

/** Keeps digits, spaces, dashes and brackets; max 12 digits. */
export function cleanPhone(v) {
  let out = '';
  let d = 0;
  for (const ch of String(v || '')) {
    if (/\d/.test(ch)) { if (d >= 12) continue; d += 1; out += ch; } else if (/[\s\-()]/.test(ch)) out += ch;
  }
  return out;
}

/** Returns an error key or '' (keys are translated in ui.json -> co.err). */
export function validateDetails(f, { needPhone = true, gift = false } = {}) {
  const e = {};
  if (String(f.name || '').trim().length < 2) e.name = 'name';
  const d = phoneDigits(f.phone).length;
  if (needPhone && d === 0) e.phone = 'phoneReq';
  else if (d > 0 && (d < 7 || d > 12)) e.phone = 'phoneLen';
  if (!String(f.email || '').trim()) e.email = 'emailReq';
  else if (!isEmail(f.email)) e.email = 'email';
  if (gift) {
    if (String(f.giftName || '').trim().length < 2) e.giftName = 'name';
    if (!isEmail(f.giftEmail)) e.giftEmail = 'email';
  }
  return e;
}

// ------------------------------------------------------------------ dates
/** "YYYY-MM-DD" for today in a time zone. */
export function todayIn(tz, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export const weekday = (ymd) => new Date(`${ymd}T12:00:00Z`).getUTCDay();

/** Is this date bookable under the settings (window + weekdays)? */
export function dateAllowed(ymd, s, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || '')) return false;
  const today = todayIn(s.booking_timezone, now);
  const last = addDays(today, s.booking_days_ahead);
  return ymd >= today && ymd <= last && s.booking_weekdays.includes(weekday(ymd));
}

/** Times still in the future when the chosen date is today (in Abir's zone). */
export function timesFor(ymd, s, now = new Date()) {
  if (ymd !== todayIn(s.booking_timezone, now)) return s.booking_times;
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: s.booking_timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  return s.booking_times.filter((t) => t > hm);
}

// ------------------------------------------------------------------ server calls
const ERR = {
  'invalid name': 'name', 'invalid email': 'email', 'invalid phone': 'phoneLen', 'phone required': 'phoneReq',
  'time not available': 'slot', 'date not available': 'slot', 'day not available': 'slot', 'date and time required': 'slot',
  'slot taken': 'slot', 'sold out': 'soldout', 'verification required': 'verify', 'payment required': 'paynotopen', 'payments not open': 'paynotopen', 'invalid gift mode': 'giftmode',
  'workshop not available': 'gone', 'item not available': 'gone', 'invalid gift email': 'email',
  'too many sessions': 'tooMany', rate_limited: 'busy', 'session price not set': 'noprice', 'sign in required': 'signin', 'delivery required': 'delivery', 'invalid whatsapp': 'whatsapp',
};

/** Free 1:1 times Abir has posted, as { 'YYYY-MM-DD': ['10:00', ...] } (already-booked and past times are left out by the database). */
export async function loadSlots() {
  if (!supabase) return {};
  const { data, error } = await supabase.rpc('available_slots');
  if (error) { console.warn('[slots]', error.message); return {}; }
  return groupSlots(data);
}

export function groupSlots(rows) {
  const out = {};
  for (const r of rows || []) (out[r.date] ||= []).push(r.time);
  for (const d of Object.keys(out)) out[d].sort();
  return out;
}

/** Workshop seats as visitors see them: { [workshopId]: { shown, sold_out } }. `shown` is 1 per 5 real seats left. */
export async function loadSeats() {
  if (!supabase) return {};
  const { data, error } = await supabase.rpc('workshop_seats');
  if (error) { console.warn('[seats]', error.message); return {}; }
  return data || {};
}

/**
 * What the visitor may open for a course (only if it is free or they bought it): { file_path, video_id, url }.
 * `url` is a short-lived signed link to the private file. Returns null when nothing is available.
 */
export async function getCourseAccess(courseId) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('course_access', { p_id: courseId });
  if (error || !data) return null;
  return { ...data, url: data.file_path ? await signedFileUrl(data.file_path) : null };
}

export async function signedFileUrl(path, seconds = 3600) {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from('paid-files').createSignedUrl(path, seconds);
  if (error) { console.warn('[file]', error.message); return null; }
  return data.signedUrl;
}

/** Asks the email function to send the booking confirmation (fire and forget: a failure must never block a booking). */
export async function sendBookingEmail(ref) {
  if (!supabase || !ref) return false;
  try {
    const { data } = await supabase.functions.invoke('booking-email', { body: { ref } });
    return data?.sent === true || data?.reason === 'already_sent'; // false when no email service is connected yet
  } catch { return false; }
}

/** Checks a booking WITHOUT saving anything (used before an account is created). Resolves { ok } or { error }. */
export async function checkBooking(payload) {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.rpc('check_booking', { p: payload });
  if (error) {
    const key = Object.keys(ERR).find((k) => (error.message || '').includes(k));
    console.warn('[check]', error.message);
    return { error: key ? ERR[key] : 'generic' };
  }
  return data;
}

/** Saves an order through the create_order() database function. Returns { ref, amount_usd, status } or { error }. */
export async function createOrder(payload) {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.rpc('place_order', { p: payload });
  if (error) {
    const key = Object.keys(ERR).find((k) => (error.message || '').includes(k));
    console.warn('[order]', error.message);
    return { error: key ? ERR[key] : 'generic' };
  }
  return data;
}

/** Buys a gift: gift_mode 'card' (sender details only; sender shares the link) or 'direct' (receiver is emailed the link). */
export async function createGiftOrder(payload) {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.rpc('place_order', { p: payload });
  if (error) {
    const key = Object.keys(ERR).find((k) => (error.message || '').includes(k));
    console.warn('[gift order]', error.message);
    return { error: key ? ERR[key] : 'generic' };
  }
  return data;
}

/** The gift page: what is inside, who sent it, and whether it can be claimed. null = no such gift. */
export async function getGiftInfo(token) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('gift_info', { p_token: token });
  if (error) { console.warn('[gift]', error.message); return null; }
  return data;
}

/** Claim a gift (signed in): the course is added to My courses. Returns { title } or { error }. */
export async function redeemGift(token) {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.rpc('redeem_gift', { p_token: token });
  if (error) {
    const m = error.message || '';
    return { error: /already claimed/.test(m) ? 'redeemed' : /not paid/.test(m) ? 'unpaid' : /not found/.test(m) ? 'notfound' : 'generic' };
  }
  return data;
}

export async function getMyGifts() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('my_gifts');
  if (error) { console.warn('[my gifts]', error.message); return []; }
  return data || [];
}

/** The link a gift receiver opens. */
export const giftUrl = (token) => `${window.location.origin}${import.meta.env.BASE_URL}gift/${token}`;

/** Starts a card payment for the booking details (nothing is saved as an order until the payment is confirmed). Resolves the card-form data or { error }. */
export async function startPayment(payload) {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('paymob-checkout', { body: payload });
  if (error || !data?.clientSecret || !data?.publicKey) {
    let msg = '';
    try { msg = (await error?.context?.json?.())?.error || ''; } catch { /* body not JSON */ }
    console.warn('[payment]', msg, error?.message);
    const key = Object.keys(ERR).find((k) => msg.includes(k));
    return { error: key ? ERR[key] : 'generic' };
  }
  // `url` (Paymob's hosted page) is only a fallback if the embedded form cannot load; never send visitors anywhere else
  if (data.url && !/^https:\/\/([a-z]+\.)?paymob\.com\//.test(data.url)) return { error: 'generic' };
  return data;
}

/** TEST MODE only: finishes a pretend payment started by paymob-checkout (books for real, no money). Resolves { outcome } or { error }. */
export async function testPay(body) {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('test-payment', { body });
  if (error || !data?.outcome || !['paid', 'ignored', 'duplicate'].includes(data.outcome)) return { error: data?.outcome || 'generic' };
  return data;
}

/** Polls the database until the order is paid (or gives up). Resolves to the last status object, or null. */
export async function waitForPaid(ref, { tries = 12, everyMs = 2500 } = {}) {
  let last = null;
  for (let i = 0; i < tries; i += 1) {
    last = await getOrderStatus(ref);
    if (last && ['paid', 'confirmed', 'completed'].includes(last.status)) return last;
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return last;
}

/** Everything the booking page needs, by reference. The joining link is only included from 2 hours before the start. */
export async function getBookingPage(ref) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('booking_page', { p_ref: ref, p_key: accessKeyFor(ref) });
  if (error) { console.warn('[booking]', error.message); return null; }
  return data;
}

// ---------------------------------------------------------------- paying without an account
// The person who pays keeps a private key in their own browser. It lets this device see the session link without a login;
// the database only stores a hash of it. (It is lost if the browser's data is cleared: the emailed link and the account still work.)
const KEY_PREFIX = 'abir-access:';
export const newAccessKey = () => {
  const b = new Uint8Array(24);
  (globalThis.crypto || window.crypto).getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};
export function accessKeyFor(ref) {
  try { return localStorage.getItem(KEY_PREFIX + String(ref).toUpperCase()) || null; } catch { return null; }
}
/** Remember the key for these bookings on this device and register it with the database. */
export async function registerAccess(refs, key) {
  const list = (refs || []).filter(Boolean);
  if (!supabase || !key || list.length === 0) return;
  try { list.forEach((r) => localStorage.setItem(KEY_PREFIX + String(r).toUpperCase(), key)); } catch { /* private mode: the emailed link still works */ }
  const { error } = await supabase.rpc('register_access', { p_refs: list, p_key: key });
  if (error) console.warn('[access]', error.message);
}
/** Does this email already have an account? (decides between "create your password" and "sign in" after paying as a guest) */
export async function emailHasAccount(email) {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('email_has_account', { p_email: email });
  if (error) { console.warn('[account?]', error.message); return false; }
  return !!data;
}
/** Every booking paid for on this device: [{ ref, key }] */
function keptKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) out.push({ ref: k.slice(KEY_PREFIX.length), key: localStorage.getItem(k) });
    }
  } catch { /* private mode */ }
  return out.slice(0, 20);
}
/**
 * A signed-in member attaches (1) earlier orders made with their confirmed email and (2) the bookings paid for on this device
 * (proved by the private key, even if the email typed differently). Resolves to how many were attached.
 */
export async function claimMyOrders() {
  if (!supabase) return 0;
  let n = 0;
  const a = await supabase.rpc('claim_my_orders');
  if (a.error) console.warn('[claim]', a.error.message); else n += Number(a.data) || 0;
  const pairs = keptKeys();
  if (pairs.length) {
    const b = await supabase.rpc('claim_with_keys', { p_pairs: pairs });
    if (b.error) console.warn('[claim keys]', b.error.message); else n += Number(b.data) || 0;
  }
  return n;
}

/** The name on the customer's latest booking (used to greet them when their account has no name saved). */
export async function getMyDisplayName() {
  if (!supabase) return '';
  const { data, error } = await supabase.rpc('my_display_name');
  if (error) { console.warn('[name]', error.message); return ''; }
  return String(data || '').trim();
}

/** Signed-in customer: their bookings / purchased courses. */
export async function getMyOrders() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('my_orders');
  if (error) { console.warn('[my orders]', error.message); return []; }
  return data || [];
}
export async function getMyLibrary() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('my_library');
  if (error) { console.warn('[my library]', error.message); return []; }
  return data || [];
}

/** Release rule (mirrors the database): the link shows from 2 h before the start to 6 h after. */
export const RELEASE_BEFORE_MS = 2 * 60 * 60 * 1000;
/** The Join button only works from 30 minutes before the start until 6 hours after it (the link itself can be seen and copied earlier). */
export const JOIN_OPENS_BEFORE_MS = 30 * 60 * 1000;
export const JOIN_CLOSES_AFTER_MS = 6 * 60 * 60 * 1000;
export const joinOpensAt = (startsAt) => (startsAt ? new Date(new Date(startsAt).getTime() - JOIN_OPENS_BEFORE_MS) : null);
/** 'early' = too soon to join, 'open' = join now, 'ended' = too late. (No start time known = open.) */
export function joinState(startsAt, now = Date.now()) {
  if (!startsAt) return 'open';
  const t = new Date(startsAt).getTime();
  if (now < t - JOIN_OPENS_BEFORE_MS) return 'early';
  if (now > t + JOIN_CLOSES_AFTER_MS) return 'ended';
  return 'open';
}
export const releaseAt = (startsAt) => (startsAt ? new Date(new Date(startsAt).getTime() - RELEASE_BEFORE_MS) : null);

/** Status of an order by its reference (for the payment-return page). */
export async function getOrderStatus(ref) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('order_status', { p_ref: ref });
  if (error) { console.warn('[order status]', error.message); return null; }
  return data;
}

export async function submitStory(payload) {
  if (!supabase) return { error: 'offline' };
  const { error } = await supabase.rpc('submit_story', { p: payload });
  if (error) { console.warn('[story]', error.message); return { error: 'generic' }; }
  return { ok: true };
}

// ------------------------------------------------------------------ calendar
const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

/** UTC Date for a wall-clock date+time in a time zone. */
export function zonedToUtc(ymd, hm, tz) {
  const guess = new Date(`${ymd}T${hm}:00Z`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(guess).map((p) => [p.type, p.value]));
  const asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess.getTime() - (asIfUtc - guess.getTime()));
}

export function googleCalendarUrl({ title, start, minutes = 60, details = '' }) {
  const end = new Date(start.getTime() + minutes * 60000);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(start)}/${stamp(end)}`, details });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function icsDataUrl({ title, start, minutes = 60, details = '', uid }) {
  const end = new Date(start.getTime() + minutes * 60000);
  const esc = (s) => String(s).replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Abir Diab//Booking//EN', 'BEGIN:VEVENT',
    `UID:${uid}@abirdiab.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(details)}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}
