import { zonedToUtc } from './orders.js';

/** The visitor's own time zone (from their browser/device), e.g. "Africa/Cairo". Falls back to the booking zone. */
export function viewerZone(fallback = 'UTC') {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback; } catch { return fallback; }
}

// Names the browser writes as "GMT+4" are shown the way people say them
const NAMED = {
  'Asia/Dubai': 'GST', 'Asia/Muscat': 'GST',
  'Asia/Riyadh': 'AST', 'Asia/Kuwait': 'AST', 'Asia/Qatar': 'AST', 'Asia/Bahrain': 'AST', 'Asia/Baghdad': 'AST', 'Asia/Aden': 'AST',
};

/** "GST", "EST", "GMT+2" ... for a zone at a moment. */
export function zoneAbbr(tz, at = new Date()) {
  if (NAMED[tz]) return NAMED[tz];
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value || tz;
  } catch { return tz; }
}

const partsIn = (tz, at) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
}).formatToParts(at).map((p) => [p.type, p.value]));

/**
 * Turns the posted times ({ 'YYYY-MM-DD': ['10:00', ...] }, in the booking zone) into the visitor's own days and times.
 * Returns { days: ['YYYY-MM-DD' in the visitor's zone], byDay: { day: [{ key, date, time, label, at }] } }.
 * `date` / `time` stay in the booking zone: that is what the booking is saved with.
 */
export function slotsForViewer(slotMap, bookingTz, viewerTz) {
  const byDay = {};
  for (const [date, times] of Object.entries(slotMap || {})) {
    for (const time of times) {
      const at = zonedToUtc(date, time, bookingTz);
      const p = partsIn(viewerTz, at);
      const day = `${p.year}-${p.month}-${p.day}`;
      (byDay[day] ||= []).push({ key: `${date}|${time}`, day, date, time, label: `${p.hour}:${p.minute} ${zoneAbbr(viewerTz, at)}`, hm: `${p.hour}:${p.minute}`, at });
    }
  }
  for (const d of Object.keys(byDay)) byDay[d].sort((a, b) => a.at - b.at);
  return { days: Object.keys(byDay).sort(), byDay };
}
