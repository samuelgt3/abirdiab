import { isUpcoming, splitBookings } from './account.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ]/g, '').trim(); // ignores case and Arabic marks

/** Everything a visitor might type to find a booking: its title, reference, status and the date in words. */
function haystack(b, lang) {
  let date = '';
  if (b.starts_at) {
    try {
      date = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: b.session_timezone || undefined }).format(new Date(b.starts_at));
    } catch { /* unknown zone: no date words */ }
  }
  return norm([b.item_title, b.title_ar, b.ref, b.status, date].join(' '));
}

/**
 * Filters and orders a list of bookings.
 *  when: 'all' | 'upcoming' | 'past'   q: text to find   sort: 'smart' (upcoming soonest, then past latest) | 'newest' | 'oldest'
 */
export function filterBookings(list, { when = 'all', q = '', sort = 'smart' } = {}, { now = Date.now(), lang = 'en' } = {}) {
  const needle = norm(q);
  let out = (list || []).filter((b) => when === 'all' || (when === 'upcoming') === isUpcoming(b, now));
  if (needle) out = out.filter((b) => haystack(b, lang).includes(needle));
  const t = (b) => (b.starts_at ? new Date(b.starts_at).getTime() : null);
  if (sort === 'newest') out = [...out].sort((a, b) => (t(b) ?? -Infinity) - (t(a) ?? -Infinity));
  else if (sort === 'oldest') out = [...out].sort((a, b) => (t(a) ?? Infinity) - (t(b) ?? Infinity));
  else { const s = splitBookings(out, now); out = [...s.upcoming, ...s.past]; }
  return out;
}

/** How many bookings each "when" chip would show (for the little numbers on the chips). */
export function whenCounts(list, now = Date.now()) {
  const all = list || [];
  const up = all.filter((b) => isUpcoming(b, now)).length;
  return { all: all.length, upcoming: up, past: all.length - up };
}

/** Courses: filtered by type (Course, Meditation, ...) and by text in the title. */
export function filterLibrary(view, { type = 'all', q = '' } = {}, pick = (c) => c.title) {
  const needle = norm(q);
  return (view || []).filter(({ c }) => (type === 'all' || c.type === type) && (!needle || norm([pick(c), c.title, c.title_ar].join(' ')).includes(needle)));
}
