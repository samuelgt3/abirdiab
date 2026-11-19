import { useMemo, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * A month calendar for picking a day. `days` = the available days as "YYYY-MM-DD" (the rest are greyed out and can't be pressed).
 * Starts on the month of the first available day; the arrows stop at the first and last month that has a free day.
 */
export default function DayCalendar({ days, marked = [], value, onPick, lang, prevLabel, nextLabel }) {
  const set = useMemo(() => new Set(days), [days]);
  const sorted = useMemo(() => [...days].sort(), [days]);
  const monthOf = (s) => [Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1];
  const first = sorted.length ? monthOf(sorted[0]) : null;
  const last = sorted.length ? monthOf(sorted[sorted.length - 1]) : null;
  const [view, setView] = useState(() => (value ? monthOf(value) : first));
  if (!first || !view) return null;

  const [y, m] = view;
  const idx = (yy, mm) => yy * 12 + mm;
  const canPrev = idx(y, m) > idx(...first);
  const canNext = idx(y, m) < idx(...last);
  const go = (delta) => { const t = idx(y, m) + delta; setView([Math.floor(t / 12), t % 12]); };

  const loc = lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB';
  const title = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, 1)));
  // week starts on Monday
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i))));
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const arrow = 'flex h-7 w-7 items-center justify-center rounded-full border border-green/25 text-green transition hover:bg-green/5 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="mx-auto max-w-[300px] rounded-lg border border-green/20 bg-white p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(-1)} disabled={!canPrev} aria-label={prevLabel} className={arrow}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rtl:rotate-180"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-[14px] font-semibold text-ink" aria-live="polite">{title}</div>
        <button type="button" onClick={() => go(1)} disabled={!canNext} aria-label={nextLabel} className={arrow}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rtl:rotate-180"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[12px] text-ink/75" aria-hidden="true">
        {weekdays.map((w) => <div key={w} className="py-0.5">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const key = ymd(y, m, d);
          const open = set.has(key);
          const picked = value === key;
          const has = marked.includes(key);
          return (
            <button key={key} type="button" disabled={!open} aria-pressed={picked}
              aria-label={new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`))}
              onClick={() => onPick(key)}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition ${picked ? 'bg-green font-semibold text-cream' : has ? 'border border-green bg-green/15 font-bold text-green'
                : open ? 'border border-green/40 font-semibold text-green hover:bg-green/10' : 'cursor-default text-ink/30'}`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
