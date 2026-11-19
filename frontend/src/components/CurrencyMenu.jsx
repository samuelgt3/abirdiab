import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OFFERED } from '../lib/pricing.js';

/** "US dollar" in the visitor's language (falls back to the bare code). */
function nameOf(code, lang) {
  try { return new Intl.DisplayNames([lang === 'ar' ? 'ar' : 'en'], { type: 'currency' }).of(code) || code; } catch { return code; }
}

/**
 * The currency menu in the header: shows the current currency; opens a searchable list of EVERY currency we have a live rate for.
 * The visitor's own country currency and the most common ones come first.
 */
export default function CurrencyMenu({ lang, currency, home, codes, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef(null);
  const btn = useRef(null);
  const search = useRef(null);
  const panel = useRef(null);

  // keep the list inside the screen (on a phone the button sits near the right edge)
  useLayoutEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    el.style.transform = '';
    const r = el.getBoundingClientRect();
    const pad = 12;
    if (r.right > window.innerWidth - pad) el.style.transform = `translateX(${window.innerWidth - pad - r.right}px)`;
    else if (r.left < pad) el.style.transform = `translateX(${pad - r.left}px)`;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    search.current?.focus();
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key); };
  }, [open]);

  const rows = useMemo(() => {
    const all = [...new Set([...(codes || []), currency, home].filter(Boolean))];
    const first = [...new Set([home, currency, ...OFFERED])].filter((c) => all.includes(c));
    const rest = all.filter((c) => !first.includes(c)).sort();
    return [...first, ...rest].map((c) => ({ code: c, name: nameOf(c, lang), top: first.includes(c) }));
  }, [codes, currency, home, lang]);

  const needle = q.trim().toLowerCase();
  const shown = needle ? rows.filter((r) => r.code.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle)) : rows;
  const label = lang === 'ar' ? 'عملة الأسعار' : 'Price currency';

  return (
    <div ref={box} className="relative flex">
      <button ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${currency}`} onClick={() => { setOpen(!open); setQ(''); }}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-s-full bg-transparent py-2 pe-2 ps-3 text-[12.5px] font-semibold text-green hover:bg-green/5 sm:min-h-0 sm:py-2.5">
        {currency}
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" className={`transition ${open ? 'rotate-180' : ''}`}><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div ref={panel} className="absolute start-0 top-[calc(100%+8px)] z-[250] w-[270px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-green/15 bg-cream p-2 shadow-[0_16px_36px_rgba(18,63,53,.2)]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <input ref={search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === 'ar' ? 'ابحثوا عن عملة…' : 'Search currencies…'} aria-label={lang === 'ar' ? 'ابحثوا عن عملة' : 'Search currencies'}
            className="mb-2 w-full rounded-lg border border-green/25 bg-white px-3 py-2 text-[14px] text-ink placeholder:text-ink/50 focus:border-green focus:outline-none" />
          <ul role="listbox" aria-label={label} className="m-0 max-h-[300px] list-none overflow-y-auto p-0">
            {shown.length === 0 && <li className="px-3 py-3 text-[13.5px] text-ink/70">{lang === 'ar' ? 'لا توجد نتيجة' : 'No match'}</li>}
            {shown.map((r, i) => (
              <li key={r.code} role="presentation">
                {!needle && i > 0 && r.top !== shown[i - 1].top && <div className="mx-2 my-1 border-t border-green/15" />}
                <button type="button" role="option" aria-selected={r.code === currency} onClick={() => { onPick(r.code); setOpen(false); btn.current?.focus(); }}
                  className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-[14px] ${r.code === currency ? 'bg-green/10 font-semibold text-green' : 'text-ink hover:bg-green/5'}`}>
                  <span dir="ltr" className="w-9 shrink-0 font-semibold">{r.code}</span>
                  <span className="min-w-0 flex-1 truncate text-ink/75">{r.name}</span>
                  {r.code === currency && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
