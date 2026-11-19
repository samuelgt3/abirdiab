import { useEffect, useRef } from 'react';
import { joinState } from '../lib/orders.js';
import Modal from '../components/Modal.jsx';

// ---------------------------------------------------------------- icons (24px stroke icons)
const PATHS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  orders: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  testimonials: 'M3 21c3 0 7-1 7-8V5H3v8h4M14 21c3 0 7-1 7-8V5h-7v8h4',
  courses: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z',
  workshops: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  journal: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  stories: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  menu: 'M3 6h18M3 12h18M3 18h18',
  headphones: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 15-3.4L23 10M1 14l4.5 4.4A9 9 0 0 0 20.5 15',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  card: 'M2 5h20v14H2zM2 10h20',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
};

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path d={PATHS[name] || PATHS.alert} />
    </svg>
  );
}

// ---------------------------------------------------------------- small pieces
const TONES = {
  green: 'border-green/30 bg-green/10 text-green',
  amber: 'border-accent/50 bg-accent/15 text-terracotta',
  red: 'border-danger/30 bg-danger/10 text-danger',
  gray: 'border-ink/15 bg-ink/5 text-ink/65',
};
/**
 * The host's "Join" button: opens the meeting link in a new tab, from 30 minutes before the start until 6 hours after it.
 * Outside that time it is greyed out (with a hint). Shows nothing when there is no safe (https) link.
 */
export function JoinButton({ url, start, className = '' }) {
  if (!url || !/^https:\/\//i.test(String(url).trim())) return null;
  const st = joinState(start);
  if (st !== 'open') {
    return (
      <button type="button" disabled aria-disabled="true" onClick={(e) => e.stopPropagation()}
        title={st === 'early' ? 'Join opens 30 minutes before the start' : 'This meeting ended more than 6 hours ago'}
        className={`btn-solid !gap-1.5 !py-1.5 !px-3.5 !text-[13px] !text-cream opacity-45 ${className}`}>
        <Icon name="external" size={14} /> {st === 'early' ? 'Join later' : 'Closed'}
      </button>
    );
  }
  return (
    <a href={String(url).trim()} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
      className={`btn-solid !gap-1.5 !py-1.5 !px-3.5 !text-[13px] !text-cream no-underline ${className}`}>
      <Icon name="external" size={14} /> Join
    </a>
  );
}

export const Badge = ({ tone = 'gray', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${TONES[tone]} ${className}`}>{children}</span>
);

/** Accessible on/off switch. */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${checked ? 'bg-green' : 'bg-ink/25'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-[22px]' : 'start-0.5'}`} />
    </button>
  );
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 font-serif text-[1.7rem] font-normal leading-tight text-ink">{title}</h1>
        {sub && <p className="m-0 mt-1 max-w-2xl text-[14px] text-ink/65">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label className="relative block min-w-[200px] flex-1 sm:max-w-xs">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink/45" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-full border border-green/25 bg-white py-2 pe-3 ps-9 text-[14px] outline-none focus:border-green" />
    </label>
  );
}

export const Chip = ({ on, onClick, children, count }) => (
  <button type="button" aria-pressed={on} onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition ${on ? 'border-green bg-green font-semibold text-cream' : 'border-green/25 bg-white text-green hover:bg-green/5'}`}>
    {children}
    {count !== undefined && <span className={`rounded-full px-1.5 text-[12px] ${on ? 'bg-cream/20' : 'bg-green/10'}`}>{count}</span>}
  </button>
);

export const Card = ({ children, className = '' }) => (
  <section className={`rounded-xl border border-green/15 bg-white p-4 shadow-[0_1px_3px_rgba(18,63,53,.05)] sm:p-5 ${className}`}>{children}</section>
);

export function Empty({ icon = 'alert', title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-green/25 bg-white/60 px-6 py-10 text-center">
      <Icon name={icon} size={28} className="mx-auto mb-3 text-green/50" />
      <div className="font-serif text-lg text-ink">{title}</div>
      {children && <div className="mx-auto mt-1 max-w-md text-[14px] text-ink/65">{children}</div>}
    </div>
  );
}

export const Skeleton = ({ rows = 4 }) => (
  <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-2">
    {Array.from({ length: rows }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-green/[.07]" />)}
  </div>
);

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <h3 className="mb-2 font-serif text-2xl">{title}</h3>
      <div className="mb-5 text-[15px] leading-relaxed text-ink/75">{children}</div>
      <div className="flex justify-end gap-2.5">
        <button type="button" className="btn-outline !py-2" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className={`btn !py-2 text-white ${danger ? '!bg-danger' : '!bg-green'}`}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

/** Side panel for editing. Esc closes; the caller decides what "close" means (e.g. ask about unsaved changes). */
export function Drawer({ open, title, subtitle, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex justify-end bg-ink/45" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className="flex h-full w-full max-w-[980px] flex-col bg-cream shadow-2xl outline-none sm:w-[92vw]">
        <header className="flex items-start justify-between gap-3 border-b border-green/15 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="m-0 truncate font-serif text-[1.35rem] font-normal">{title}</h2>
            {subtitle && <p className="m-0 text-[13px] text-ink/60">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-ink/60 hover:bg-sand"><Icon name="close" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-green/15 bg-white px-5 py-3">{footer}</footer>}
      </aside>
    </div>
  );
}

export const money = (usd) => `$${Number(usd || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
export const fmtDate = (iso, opts = { dateStyle: 'medium', timeStyle: 'short' }) => (iso ? new Date(iso).toLocaleString('en-GB', opts) : '');
