/** Is this booking still ahead of us (or happening now)? Cancelled and refunded ones are never "upcoming". */
export function isUpcoming(b, now = Date.now()) {
  if (['cancelled', 'refunded'].includes(b.status)) return false;
  if (!b.starts_at) return false;
  return new Date(b.starts_at).getTime() + 3 * 3600 * 1000 > now;
}

/** Splits bookings into upcoming (soonest first) and past (latest first). */
export function splitBookings(list, now = Date.now()) {
  const up = []; const past = [];
  for (const b of list || []) (isUpcoming(b, now) ? up : past).push(b);
  up.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  past.sort((a, b) => new Date(b.starts_at || 0) - new Date(a.starts_at || 0));
  return { upcoming: up, past };
}

const fill = (str, v) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, x ?? ''), str);

/** "in 19 hours" / "in 2 days" / "starting now". Arabic follows its own number rules (1 and 11+ singular, 2 dual, 3-10 plural). */
export function countdownText(startIso, copy, now = Date.now()) {
  const ms = new Date(startIso).getTime() - now;
  if (ms <= 0) return copy.in.now;
  const total = Math.floor(ms / 60000);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  const ar = !!copy.units.arabic;
  const phrase = (count, key, forms, dual) => {
    if (ar && count === 2) return copy.in[dual];
    const plural = ar ? count >= 3 && count <= 10 : count !== 1;
    return fill(copy.in[key], { n: count, u: forms[plural ? 1 : 0] });
  };
  if (days >= 1) return phrase(days, 'days', copy.units.d, 'days2');
  if (hours >= 1) return phrase(hours, 'hours', copy.units.h, 'hours2');
  if (minutes < 1) return copy.in.now;
  return phrase(minutes, 'minutes', copy.units.m, 'minutes2');
}
