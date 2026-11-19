import { useState } from 'react';
import { Link } from 'react-router-dom';
import acct from '../content/account.json';
import pageCopy from '../content/accountPage.json';
import { useSite } from '../hooks/SiteContext.jsx';
import { countdownText } from '../lib/account.js';
import { format } from '../lib/pricing.js';
import { googleCalendarUrl, icsDataUrl, joinOpensAt, joinState } from '../lib/orders.js';
import { useNow } from '../lib/useNow.js';

/**
 * One booking, laid out so the next step is obvious: a date tile, what and when, ONE clear action
 * (pay, join, or "your link arrives at …"), and the small things (calendar, reference) underneath.
 * The joining link is shown only once the database releases it, 2 hours before the start.
 */
export default function BookingCard({ b, showPageLink = false }) {
  const { lang } = useSite();
  const c = acct[lang].booking;
  const p = pageCopy[lang];
  const [copied, setCopied] = useState(false);
  const now = useNow();
  // sessions are shown in the time zone they were booked in (Abir's); workshops in the visitor's own zone — always with the zone name
  const tz = b.kind === 'session' ? b.session_timezone || undefined : undefined;
  const locale = lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB';
  const fmt = (iso, opts, zone = true) => new Intl.DateTimeFormat(locale, { ...opts, timeZone: tz, ...(zone ? { timeZoneName: 'short' } : {}) }).format(new Date(iso));
  const start = b.starts_at ? new Date(b.starts_at) : null;
  const ended = start && Date.now() > start.getTime() + 6 * 3600 * 1000;
  const hasEvent = b.kind === 'session' || b.kind === 'workshop';
  const amount = b.charge_amount_cents ? format(b.charge_amount_cents / 100, b.charge_currency, lang) : '';
  const releaseText = b.release_at ? fmt(b.release_at, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const calTitle = `${b.item_title} — Abir Diab`;
  const minutes = b.kind === 'session' ? 60 : 120;

  async function copy() {
    try { await navigator.clipboard.writeText(b.join_url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* ignore */ }
  }

  // the one thing to do next
  let action = null;
  if (hasEvent) {
    if (!b.paid) {
      action = null; // unpaid bookings no longer exist: a booking is only created once it is paid
    } else if (b.released && b.join_url) {
      action = (
        <div className="rounded-lg border border-green/25 bg-green/5 p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {joinState(b.starts_at, now) === 'open'
              ? <a href={b.join_url} target="_blank" rel="noopener noreferrer" className="btn-solid !py-2.5 !text-cream no-underline">{c.join}</a>
              : <button type="button" disabled aria-disabled="true" className="btn-solid !py-2.5 cursor-not-allowed opacity-45">{c.join}</button>}
            <button type="button" onClick={copy} className="btn-outline !py-2.5">{copied ? c.copied : c.copy}</button>
          </div>
          {joinState(b.starts_at, now) === 'ended' && <p role="status" className="mb-0 mt-2.5 text-[13.5px] font-semibold text-ink/80">{c.joinEnded}</p>}
          {joinState(b.starts_at, now) === 'early' && (
            <p role="status" className="mb-0 mt-2.5 text-[13.5px] font-semibold text-ink/80">
              {c.joinLocked.replace('{when}', fmt(joinOpensAt(b.starts_at).toISOString(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}
            </p>
          )}
          <div dir="ltr" className="mt-2.5 break-all text-[12.5px] text-ink/75">{b.join_url}</div>
        </div>
      );
    } else if (b.released) {
      action = <p className="m-0 rounded-lg bg-sand p-3.5 text-[14px] text-ink/75">{b.mine ? c.linkPending : c.linkSignIn}</p>;
    } else if (ended) {
      action = <p className="m-0 text-[14px] text-ink/75">{c.linkClosed}</p>;
    } else {
      action = (
        <p className="m-0 rounded-lg bg-sand p-3.5 text-[14px] leading-relaxed text-ink/75">
          {b.kind === 'workshop' && b.guest && !b.mine ? c.linkWaitGuest : c.linkWait.replace('{when}', releaseText)}
        </p>
      );
    }
  }

  const dayNum = start ? fmt(b.starts_at, { day: 'numeric' }, false) : '';
  const monthName = start ? fmt(b.starts_at, { month: 'short' }, false) : '';
  const timeText = start ? fmt(b.starts_at, { weekday: 'long', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <article className="flex gap-4 rounded-2xl border border-green/15 bg-white p-4 shadow-[0_2px_10px_rgba(18,63,53,.05)] sm:p-5">
      {start && (
        <div className={`flex h-[68px] w-[60px] shrink-0 flex-col items-center justify-center rounded-xl text-center leading-none ${ended ? 'bg-ink/10 text-ink/75' : 'bg-green text-cream'}`} aria-hidden="true">
          <span className="text-[12px] font-semibold uppercase tracking-[.06em] opacity-80">{monthName}</span>
          <span className="mt-1 font-serif text-[1.7rem]">{dayNum}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className="m-0 font-serif text-[1.25rem] font-normal leading-tight text-ink">{b.item_title}</h3>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs ${b.paid ? 'border-green/30 bg-green/10 text-green' : 'border-accent/50 bg-accent/15 text-terracotta'}`}>
            {c.status[b.status] || b.status}
          </span>
        </div>
        {start && (
          <p className="mb-0 mt-1 text-[14.5px] text-ink/75">
            {timeText}
            {!ended && b.paid && <span className="ms-2 rounded-full bg-green/10 px-2 py-0.5 text-[12px] font-semibold text-green">{countdownText(b.starts_at, p)}</span>}
          </p>
        )}
        {action && <div className="mt-3.5">{action}</div>}

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink/75">
          {start && b.paid && !ended && (
            <span className="flex flex-wrap items-center gap-x-2">
              {p.addCal}:
              <a href={googleCalendarUrl({ title: calTitle, start, minutes, details: `${c.ref}: ${b.ref}` })} target="_blank" rel="noopener noreferrer" className="text-green underline underline-offset-4">Google</a>
              <a href={icsDataUrl({ title: calTitle, start, minutes, details: `${c.ref}: ${b.ref}`, uid: b.ref })} download={`abir-diab-${b.ref}.ics`} className="text-green underline underline-offset-4">Apple / Outlook</a>
            </span>
          )}
          <span>{p.ref}: <span dir="ltr" className="font-mono">{b.ref}</span></span>
          {amount && <span>{amount}</span>}
          {showPageLink && <Link to={`/booking/${b.ref}`} className="text-green underline underline-offset-4">{lang === 'ar' ? 'صفحة الحجز' : 'Booking page'}</Link>}
        </div>
      </div>
    </article>
  );
}
