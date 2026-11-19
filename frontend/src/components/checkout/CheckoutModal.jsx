import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { savePending } from '../QuickAccess.jsx';
import { accountPrefill, mergeDraft } from '../../lib/prefill.js';
import countries from '../../content/countries.json';
import acct from '../../content/account.json';
import copy from '../../content/checkout.json';
import { useAuth } from '../../hooks/AuthContext.jsx';
import { useSite } from '../../hooks/SiteContext.jsx';
import { getCourseAccess } from '../../lib/orders.js';
import {
  cleanPhone, createGiftOrder, emailHasAccount, newAccessKey, registerAccess, createOrder, getBookingPage, giftUrl, joinOpensAt, joinState, googleCalendarUrl, icsDataUrl, loadSlots, phoneDigits, sendBookingEmail, startPayment, waitForPaid,
  validateDetails, zonedToUtc,
} from '../../lib/orders.js';
import Modal from '../Modal.jsx';
import Field, { inputCls } from './Field.jsx';
import PaymobPixel from './PaymobPixel.jsx';
import TestCardForm from './TestCardForm.jsx';
import CodeVerify from './CodeVerify.jsx';
import DayCalendar from './DayCalendar.jsx';
import { slotsForViewer, viewerZone } from '../../lib/slotsTz.js';
import { suggestEmail } from '../../lib/emailTypos.js';
import { joinName } from '../../lib/names.js';
import { useNow } from '../../lib/useNow.js';
import { e164Digits } from '../../lib/verify.js';

const fill = (s, vars) => Object.entries(vars).reduce((a, [k, v]) => a.replaceAll(`{${k}}`, v ?? ''), s);
const flag = (cc) => String.fromCodePoint(...[...cc].map((ch) => 127397 + ch.charCodeAt(0)));
const minutesOf = (s) => {
  const h = /(\d+)\s*h/.exec(s || '');
  const m = /(\d+)\s*m/.exec(s || '');
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0) || 60;
};

function Steps({ steps, at, c }) {
  return (
    <ol className="mb-6 flex gap-1.5" aria-label={fill(c.stepOf, { n: at + 1, total: steps.length })}>
      {steps.map((s, i) => (
        <li key={s} className="flex-1">
          <span className={`block h-1 rounded-full ${i <= at ? 'bg-green' : 'bg-green/15'}`} />
          <span className={`mt-1.5 block text-[12px] ${i === at ? 'font-semibold text-green' : 'text-ink/75'}`}>{c.steps[s]}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * One checkout for everything: kind = session | workshop | course | gift.
 * Steps: [when] -> details -> review & pay -> done. Nothing leaves the site; card data is never collected here.
 */
export default function CheckoutModal({ order, settings, onClose }) {
  const { lang, t, u, pick, price, priceValue, currency, country, kindLabel } = useSite();
  const c = copy[lang];
  const a = acct[lang];
  const { user, name: authName, openAuth, phone: authPhone, countryCode: authCountry } = useAuth();
  // nobody is asked to sign up or sign in to pay: this key lets this device see the session link afterwards; the account is offered once the payment is done
  const [accessKey] = useState(newAccessKey);
  const [wasGuest] = useState(!user);
  const [hasAcct, setHasAcct] = useState(null); // after paying as a guest: does this email already have an account? (null = still checking)
  const handed = useRef(false);
  const navigate = useNavigate();
  const { kind, item } = order;
  const isSession = kind === 'session';
  const isOrder = kind === 'course' || kind === 'gift'; // purchases say "order", sessions/seats say "booking"
  const [at, setAt] = useState(0);

  const defaultCode = countries.some((x) => x.code === country) ? country : 'EG';
  const [f, setF] = useState({ name: '', first: '', middle: '', last: '', code: defaultCode, phone: '', email: '', notes: '', delivery: 'email', giftMode: '', giftName: '', giftEmail: '', giftMsg: '', dm: 'email', waSame: true, waCode: defaultCode, waPhone: '' });
  // signed-in customers: fill in what we already know
  useEffect(() => {
    if (user) setF((x) => accountPrefill(x, { email: user.email, name: authName, phone: authPhone, country: authCountry }, (cc) => countries.some((c) => c.code === cc)));
  }, [user, authName, authPhone, authCountry]);
  const [picks, setPicks] = useState([]); // chosen times, as "YYYY-MM-DD|HH:MM" in the booking zone (one or several sessions)
  const [lastPay, setLastPay] = useState(null); // the details sent to the card payment, kept for "try again"
  const [booked, setBooked] = useState([]);
  const [links, setLinks] = useState({}); // session ref -> the joining link, once paid
  const [copiedRef, setCopiedRef] = useState('');
  const now = useNow();
  const [emailed, setEmailed] = useState(false); // true only when the booking email was really sent
  const notifyEmail = (refs) => Promise.all(refs.map((r) => sendBookingEmail(r))).then((r) => setEmailed(r.length > 0 && r.every(Boolean))); // sessions placed: [{ s, res }]
  const [day, setDay] = useState(''); // the day picked, in the visitor's own time zone
  // the free times Abir has posted (the database already leaves out booked and past ones)
  const [slotMap, setSlotMap] = useState(null);
  // keep the list fresh: a time somebody else just booked disappears (on opening, every minute, and when the tab is shown again)
  useEffect(() => {
    if (!isSession) return undefined;
    const load = () => loadSlots().then(setSlotMap);
    load();
    const t = setInterval(load, 60000);
    const vis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [isSession]);
  // free course: a signed link to the private file, shown on the "done" screen
  const [freeFile, setFreeFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const [result, setResult] = useState(null);
  const [payFail, setPayFail] = useState('');
  const [card, setCard] = useState(null); // { publicKey, clientSecret, url } for the embedded card form
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ver, setVer] = useState({}); // { email: { target, id }, phone: { target, id } } once a code was confirmed
  const [emailChecked, setEmailChecked] = useState('');
  const [paid, setPaid] = useState(null); // order status once Paymob's confirmed payment has been recorded
  useEffect(() => {
    if (result && Number(result.amount_usd) === 0 && kind === 'course' && item?.id) getCourseAccess(item.id).then(setFreeFile);
  }, [result, kind, item]);
  const set = (k) => (e) => setF((s) => {
    const n = { ...s, [k]: k === 'phone' || k === 'waPhone' ? cleanPhone(e.target.value) : e.target.value };
    if (k === 'first' || k === 'middle' || k === 'last') n.name = joinName(n.first, n.middle, n.last);
    return n;
  });

  // price shown to the visitor (the database recomputes the real one)
  const usd = isSession ? settings.session_price_usd : item.is_free ? 0 : Number(item.price_usd) || 0;
  const priceKnown = usd !== null && usd !== undefined;
  // card payment inside this window (Paymob's embedded form) when the admin has switched it on
  const payOnline = !!settings.payments_enabled && priceKnown && usd > 0;
  // Nobody has to sign in to pay. The only exception: free courses/gifts and the "pay later" mode (card payments off) are saved
  // straight to the account, so those need one; everything that is paid online works as a guest.
  const memberSkip = !!user; // signed-in members are not asked to verify again
  const gate = !user && (kind === 'course' || kind === 'gift') && !payOnline;
  // one-time codes for email / phone, when the admin has switched verification on
  const emailTarget = f.email.trim().toLowerCase();
  const phoneTarget = e164Digits(countries.find((x) => x.code === f.code)?.dial, f.phone);
  const emailExempt = memberSkip && user.email?.toLowerCase() === emailTarget && !!user.email_confirmed_at; // already confirmed by their account
  const needEmailVerify = !!settings.require_email_verification && !emailExempt;
  const needPhoneVerify = !!settings.require_phone_verification && phoneDigits(f.phone).length > 0 && !memberSkip;
  const emailDone = ver.email?.target === emailTarget;
  const phoneDone = ver.phone?.target === phoneTarget;
  const verified = (!needEmailVerify || emailDone) && (!needPhoneVerify || phoneDone);
  const steps = [...(gate ? ['gate'] : []), ...(isSession ? ['when'] : []), 'details', ...(needEmailVerify || needPhoneVerify ? ['verify'] : []), 'pay', ...(payOnline ? ['card'] : []), 'done'];
  const step = steps[at];
  // keep what the visitor typed (not passwords) for this tab, so a refresh or the email-confirmation round trip doesn't lose it
  const draftKey = `abir-draft:${kind}:${item?.id || 'session'}`;
  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (d?.f) setF((x) => mergeDraft(x, d.f)); // typed fields only: empty ones never wipe out the signed-in customer's details
      if (isSession && Array.isArray(d?.picks)) setPicks(d.picks);
    } catch { /* no saved draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (step === 'done') sessionStorage.removeItem(draftKey);
      else sessionStorage.setItem(draftKey, JSON.stringify({ f, picks }));
    } catch { /* private mode */ }
  }, [f, picks, step, draftKey]);
  const title = isSession ? c.ctx.session : pick(item, 'title');
  // the posted times are in the booking zone; the visitor sees them in their own zone, with its name next to the hour
  const mine = useMemo(() => slotsForViewer(slotMap, settings.booking_timezone, viewerZone(settings.booking_timezone)), [slotMap, settings.booking_timezone]);
  const days = mine.days;
  const slots = day ? mine.byDay[day] || [] : [];
  // if the chosen time was just taken by someone else, drop the choice
  useEffect(() => {
    if (!slotMap || picks.length === 0) return;
    const keep = picks.filter((k) => { const [d, t] = k.split('|'); return (slotMap[d] || []).includes(t); });
    if (keep.length !== picks.length) setPicks(keep);
  }, [slotMap, picks]);
  const longDate = (ymd) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${ymd}T12:00:00Z`));
  const allSlots = Object.values(mine.byDay).flat();
  const chosen = isSession ? picks.map((k) => allSlots.find((s) => s.key === k)).filter(Boolean).sort((a, b) => a.at - b.at) : [];
  const slotText = (s) => fill(c.selected, { date: longDate(s.day), time: s.label });
  const whenText = chosen.map(slotText).join('; ');
  const workshopWhen = kind === 'workshop' && item.starts_at
    ? `${new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.starts_at))} · ${pick(item, 'time_label')}`
    : '';
  const dial = countries.find((x) => x.code === f.code)?.dial || '';

  function nextFromDetails() {
    // Paymob needs a phone number for every card payment
    const e = validateDetails({ ...f, name: joinName(f.first, f.middle, f.last) }, { needPhone: payOnline || (kind !== 'course' && kind !== 'gift'), gift: kind === 'gift' && f.giftMode === 'direct' });
    if (!f.first.trim() || !f.last.trim()) e.name = 'name';
    if (kind === 'gift' && !f.giftMode) e.giftMode = 'giftmode';
    if (isSession && f.dm === 'whatsapp' && !f.waSame) {
      const d = phoneDigits(f.waPhone).length;
      if (d < 7 || d > 12) e.waPhone = d ? 'phoneLen' : 'phoneReq';
    }
    setErrors(e);
    setTouched(true);
    if (Object.keys(e).length === 0) setAt(at + 1);
  }

  // how the joining link is delivered (sessions: chosen; workshops: guests = email only)
  const waDial = countries.find((x) => x.code === f.waCode)?.dial || '';
  const waTo = f.waSame ? `${dial}${phoneDigits(f.phone)}` : `${waDial}${phoneDigits(f.waPhone)}`;
  const dMethod = isSession ? f.dm : kind === 'workshop' ? (user ? f.delivery : 'email') : undefined;
  const dTo = dMethod === 'whatsapp' ? waTo : dMethod ? f.email.trim() : undefined;
  const waShown = f.waSame ? `${dial} ${f.phone}` : `${waDial} ${f.waPhone}`;

  // a paid 1:1 session's own link is available straight away: fetch it for the done screen
  const sessionPaid = isSession && (!!paid || result?.status === 'confirmed' || result?.status === 'paid');
  useEffect(() => {
    if (!sessionPaid || booked.length === 0) return;
    let alive = true;
    Promise.all(booked.map((b) => getBookingPage(b.res.ref).then((p) => [b.res.ref, p?.join_url || '']))).then((rows) => { if (alive) setLinks(Object.fromEntries(rows)); });
    return () => { alive = false; };
  }, [sessionPaid, booked]);

  // Paid (or booked) as a guest: the SAME page that shows the link also holds the account form, filled in with their details:
  // "create your password" if the email is new, "sign in" if that email already has an account.
  const paidNow = !!paid || result?.status === 'confirmed' || result?.status === 'paid';
  const handoffReady = wasGuest && !user && !!result?.ref && !confirming && !payFail && !serverErr && (paidNow || !payOnline);
  useEffect(() => {
    if (!handoffReady || handed.current) return;
    handed.current = true;
    emailHasAccount(f.email.trim()).then(setHasAcct);
  }, [handoffReady, f.email]);

  async function confirm() {
    setBusy(true);
    setServerErr('');
    const base = {
      kind,
      gift_mode: kind === 'gift' ? f.giftMode : undefined,
      item_id: isSession ? undefined : item.id,
      customer_name: f.name.trim(),
      email: f.email.trim(),
      phone_country: f.code,
      phone_dial: dial,
      phone: phoneDigits(f.phone),
      country: f.code,
      lang,
      notes: f.notes,
      delivery_method: dMethod,
      delivery_to: dTo,
      gift_to_name: kind === 'gift' && f.giftMode === 'direct' ? f.giftName : undefined,
      gift_to_email: kind === 'gift' && f.giftMode === 'direct' ? f.giftEmail : undefined,
      gift_message: kind === 'gift' && f.giftMode === 'direct' ? f.giftMsg : undefined,
      display_currency: currency,
      display_amount: priceKnown ? priceValue(usd) : undefined,
    };
    // no account is needed to pay: the details are simply recorded with the booking, and the account is offered after payment
    const verifyIds = { email_verification: emailDone ? ver.email.id : undefined, phone_verification: phoneDone ? ver.phone.id : undefined };

    // card payment: the customer pays first; the booking(s) are created when the payment is confirmed, nothing is saved before
    if (payOnline) {
      await beginPayment({ ...base, ...verifyIds, ...(isSession ? { sessions: chosen.map((s) => ({ date: s.date, time: s.time })) } : {}) });
      setBusy(false);
      return;
    }

    const place = kind === 'gift' ? createGiftOrder : createOrder;
    const targets = isSession ? chosen : [null];
    const placed = [];
    let res = null;
    for (const [n, s] of targets.entries()) {
    res = await place({ ...base, ...(n === 0 ? verifyIds : {}), session_date: s?.date, session_time: s?.time });
    if (res.error) break;
    placed.push({ s, res });
    if (!user) await registerAccess([res.ref], accessKey); // before the link is fetched on the done screen
    notifyEmail([res.ref]); // confirmation email; never blocks the booking
    }
    if (res.error) {
      const failed = targets.slice(placed.length).filter(Boolean);
      setBusy(false);
      setServerErr(c.err[res.error] || c.err.generic);
      if (res.error === 'slot' && isSession) { setPicks(picks.filter((k) => !placed.some((p) => p.s.key === k) && !failed.some((x) => x.key === k)) ); loadSlots().then(setSlotMap); if (!placed.length) setAt(0); }
      if (res.error === 'verify' && steps.includes('verify') && !placed.length) { setVer({}); setAt(steps.indexOf('verify')); }
      if (!placed.length) return;
      // some sessions were booked before one failed: show what is booked, and which to pick again
      setBooked(placed);
      setResult(placed[0].res);
      setServerErr(fill(c.partial, { list: failed.map(slotText).join('; ') }));
      setAt(steps.indexOf('done'));
      return;
    }
    res = placed[0].res;
    setBooked(placed);
    setResult(res);
    setBusy(false);
    setAt(steps.indexOf('done'));
  }

  /** Starts the card payment for these details and moves to the card step. Nothing is saved as a booking yet. */
  async function beginPayment(payload) {
    setPayFail('');
    setServerErr('');
    setLastPay(payload);
    const p = await startPayment(payload);
    if (p.error) {
      if (p.error === 'slot' && isSession) {
        // somebody took one of the times: refresh the list and go back to choose again
        loadSlots().then(setSlotMap);
        setServerErr(c.err.slot);
        setAt(steps.indexOf('when'));
      } else if (p.error === 'verify' && steps.includes('verify')) {
        setVer({});
        setServerErr(c.err.verify);
        setAt(steps.indexOf('verify'));
      } else setServerErr(c.err[p.error] || c.err.generic);
      return false;
    }
    if (!user) await registerAccess(p.refs?.length ? p.refs : [p.ref], accessKey); // lets this device see the session link once the payment is confirmed
    setCard(p);
    setResult({ ref: p.ref, status: 'awaiting_payment', amount_usd: p.amount_usd });
    setBooked(isSession ? chosen.map((s, i) => ({ s, res: { ref: p.refs?.[i] || p.ref } })) : []);
    setAt(steps.indexOf('card'));
    return true;
  }

  async function retryPayment() {
    if (!lastPay) return;
    setBusy(true);
    const ok = await beginPayment(lastPay);
    if (!ok) setPayFail(c.payStartFail);
    setBusy(false);
  }

  /** The card form accepted the payment: show "confirming" and wait for Paymob's signed confirmation to create the booking(s). */
  async function cardSubmitted() {
    setConfirming(true);
    setAt(steps.indexOf('done'));
    const o = await waitForPaid(result.ref);
    const ok = !!o && ['paid', 'confirmed', 'completed'].includes(o.status);
    setPaid(ok ? o : null);
    if (ok) notifyEmail(booked.length ? booked.map((b) => b.res.ref) : [result.ref]); // confirmation emails
    setConfirming(false);
  }

  /** The embedded form could not load (blocked script, offline): fall back to Paymob's own page. */
  function cardFailed() {
    if (card?.url) window.location.assign(card.url);
    else { setPayFail(c.payStartFail); setAt(steps.indexOf('done')); }
  }

  // ------------------------------------------------------------ render pieces
  const totalLabel = !priceKnown ? c.priceTbc : usd === 0 ? c.free : price(usd * Math.max(1, chosen.length));
  const err = (k) => (touched && errors[k] ? c.err[errors[k]] : '');

  let body;
  if (step === 'gate') {
    const workshop = kind !== 'course' && kind !== 'gift';
    body = (
      <>
        <h3 className="mb-2 font-serif text-[1.5rem] font-normal text-ink">{a.gate.title}</h3>
        <p className="mb-5 text-[15px] leading-relaxed text-ink/70">{workshop ? a.gate.workshopLead : a.gate.courseLead}</p>
        <button type="button" onClick={() => openAuth({ mode: 'in' })} className="btn-solid w-full !py-3.5">{a.gate.signInBtn}</button>
      </>
    );
  } else if (step === 'when') {
    body = (
      <>
        <h3 className="mb-5 font-serif text-[1.5rem] font-normal text-ink">{c.pickTitle}</h3>
        {slotMap === null && <p className="text-[14px] text-ink/75">{u.loading}</p>}
        {slotMap && days.length === 0 && <p role="status" className="rounded-md bg-sand p-4 text-[14px] text-ink/75">{c.noSlots}</p>}
        {days.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink/80">{c.pickDay}</legend>
            <DayCalendar days={days} marked={chosen.map((x) => x.day)} value={day} lang={lang} prevLabel={c.prevMonth} nextLabel={c.nextMonth} onPick={(d) => setDay(d)} />
          </fieldset>
        )}
        {day && slots.length > 0 && (
          <fieldset className="mt-5">
            <legend className="mb-1.5 text-[13px] font-semibold text-ink/80">{c.timeLabel}</legend>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button key={s.key} type="button" aria-pressed={picks.includes(s.key)} onClick={() => setPicks((p) => (p.includes(s.key) ? p.filter((k) => k !== s.key) : [...p, s.key]))}
                  className={`rounded-md border px-1 py-2.5 text-[13.5px] transition ${picks.includes(s.key) ? 'border-green bg-green font-semibold text-cream' : 'border-green/25 text-green hover:bg-green/5'}`}>
                  <span dir="ltr">{s.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <p className="mt-3 text-[12.5px] text-ink/75">{fill(c.timeNote, { len: lang === 'ar' ? settings.session_length_ar : settings.session_length })}</p>
        {days.length > 0 && <p className="mt-1 text-[12.5px] text-ink/75">{c.multiHint}</p>}
        {chosen.length > 0 && (
          <div className="mt-4 rounded-md border border-green/20 bg-sand/50 p-3">
            <div className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[.03em] text-terracotta">{c.yourTimes} ({chosen.length})</div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {chosen.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-3 text-[13.5px] font-semibold text-green">
                  <span>✓ {slotText(s)}</span>
                  <button type="button" onClick={() => setPicks((p) => p.filter((k) => k !== s.key))} className="shrink-0 text-[12.5px] font-normal text-ink/75 underline underline-offset-4 hover:text-danger">{c.removeSlot}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {serverErr && <p role="alert" className="mt-3 text-[13.5px] text-danger">{serverErr}</p>}
        <button type="button" disabled={chosen.length === 0} onClick={() => setAt(at + 1)} className="btn-solid mt-6 w-full !py-3.5">{c.continue}</button>
      </>
    );
  } else if (step === 'details') {
    body = (
      <>
        <h3 className="mb-1.5 font-serif text-[1.5rem] font-normal text-ink">{c.detailsTitle}</h3>
        <div className="mb-5 text-[13.5px] text-ink/75">
          <div className="font-semibold text-ink/80">{isSession && chosen.length > 1 ? `${title} × ${chosen.length}` : title}</div>
          {isSession ? <ul className="m-0 mt-1 list-none p-0">{chosen.map((s) => <li key={s.key} className="mb-0.5">{slotText(s)}</li>)}</ul> : workshopWhen && <div>{workshopWhen}</div>}
        </div>
        <div className="flex flex-col gap-4">
          <Field id="co-first" label={c.name} error={err('name')}>
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
              <input id="co-first" aria-label={c.first} placeholder={c.first} autoComplete="given-name" value={f.first} onChange={set('first')} className={inputCls(err('name'))} aria-invalid={!!err('name')} />
              <input id="co-middle" aria-label={c.middle} placeholder={c.middle} autoComplete="additional-name" value={f.middle} onChange={set('middle')} className={inputCls(false)} />
              <input id="co-last" aria-label={c.last} placeholder={c.last} autoComplete="family-name" value={f.last} onChange={set('last')} className={inputCls(err('name'))} aria-invalid={!!err('name')} />
            </div>
          </Field>
          <Field id="co-phone" label={c.phone} error={err('phone')} hint={c.phoneHint}>
            <div dir="ltr" className="flex gap-2">
              <select aria-label={c.code} value={f.code} onChange={set('code')} className={`${inputCls(false)} !w-[118px] shrink-0 !px-2`}>
                {countries.map((x) => <option key={x.code} value={x.code}>{flag(x.code)} {x.dial}</option>)}
              </select>
              <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel-national" value={f.phone} onChange={set('phone')}
                className={`${inputCls(err('phone'))} min-w-0 flex-1`} aria-invalid={!!err('phone')} />
            </div>
          </Field>
          <Field id="co-email" label={c.email} error={err('email')}>
            <input id="co-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={f.email} onChange={set('email')}
              onBlur={() => setEmailChecked(f.email)}
              className={`${inputCls(err('email'))} ${lang === 'ar' ? 'text-right' : ''}`} aria-invalid={!!err('email')} />
            {emailChecked === f.email && suggestEmail(f.email) && (
              <p role="status" className="mt-1.5 text-[13px] text-ink/75">
                {fill(c.emailDidYou, { s: suggestEmail(f.email) })}{' '}
                <button type="button" onClick={() => setF((s) => ({ ...s, email: suggestEmail(s.email) }))} className="font-semibold text-green underline underline-offset-4">{c.emailUse}</button>
              </p>
            )}
          </Field>
          {kind === 'workshop' && (user ? (
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold text-ink/80">{a.delivery.workshopTitle}</legend>
              <div className="flex flex-wrap gap-2">
                {['email', 'whatsapp'].map((m) => (
                  <button key={m} type="button" aria-pressed={f.delivery === m} onClick={() => setF((x) => ({ ...x, delivery: m }))}
                    className={`rounded-full border px-4 py-2 text-[13.5px] ${f.delivery === m ? 'border-green bg-green text-cream' : 'border-green/25 text-green'}`}>
                    {a.delivery[m]}
                  </button>
                ))}
              </div>
              {f.delivery === 'whatsapp' && <p className="mt-2 text-[13px] text-ink/75">{a.delivery.sendTo}: <span dir="ltr">{dial} {f.phone}</span></p>}
            </fieldset>
          ) : (
            <p className="rounded-md bg-sand p-3.5 text-[13.5px] text-ink/75">{fill(a.delivery.guestEmailOnly, { email: f.email || '…' })}</p>
          ))}
          {isSession && (
            <fieldset>
              <legend className="mb-1 text-[13px] font-semibold text-ink/80">{a.delivery.sessionTitle}</legend>
              <p className="mb-2 text-[12.5px] text-ink/75">{a.delivery.sessionNote}</p>
              <div className="flex flex-wrap gap-2">
                {['email', 'whatsapp'].map((m) => (
                  <button key={m} type="button" aria-pressed={f.dm === m} onClick={() => setF((x) => ({ ...x, dm: m }))}
                    className={`rounded-full border px-4 py-2 text-[13.5px] ${f.dm === m ? 'border-green bg-green text-cream' : 'border-green/25 text-green'}`}>
                    {a.delivery[m]}
                  </button>
                ))}
              </div>
              {f.dm === 'email' && <p className="mt-2 text-[13px] text-ink/75">{a.delivery.sendTo}: <span dir="ltr">{f.email || '…'}</span></p>}
              {f.dm === 'whatsapp' && (
                <div className="mt-3 flex flex-col gap-2.5">
                  <label className="flex items-start gap-2.5 text-[14px]">
                    <input type="radio" name="wa" className="mt-1" checked={f.waSame} onChange={() => setF((x) => ({ ...x, waSame: true }))} />
                    <span>{fill(a.delivery.waSame, { number: `${dial} ${f.phone || '…'}` })}</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-[14px]">
                    <input type="radio" name="wa" className="mt-1" checked={!f.waSame} onChange={() => setF((x) => ({ ...x, waSame: false }))} />
                    <span>{a.delivery.waOther}</span>
                  </label>
                  {!f.waSame && (
                    <Field id="co-wa" label={a.delivery.waNumber} error={err('waPhone')}>
                      <div dir="ltr" className="flex gap-2">
                        <select aria-label={c.code} value={f.waCode} onChange={set('waCode')} className={`${inputCls(false)} !w-[118px] shrink-0 !px-2`}>
                          {countries.map((x) => <option key={x.code} value={x.code}>{flag(x.code)} {x.dial}</option>)}
                        </select>
                        <input id="co-wa" type="tel" inputMode="tel" value={f.waPhone} onChange={set('waPhone')} className={`${inputCls(err('waPhone'))} min-w-0 flex-1`} />
                      </div>
                    </Field>
                  )}
                </div>
              )}
            </fieldset>
          )}
          {kind === 'gift' && (
            <fieldset className="flex flex-col gap-3 rounded-lg bg-sand/60 p-4">
              <legend className="mb-1 px-1 font-serif text-lg text-ink">{c.giftModeTitle}</legend>
              {[['card', c.giftModeCard, c.giftModeCardDesc], ['direct', c.giftModeDirect, c.giftModeDirectDesc]].map(([k, label, desc]) => (
                <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${f.giftMode === k ? 'border-green bg-white shadow-sm' : 'border-green/20 bg-white/60 hover:bg-white'}`}>
                  <input type="radio" name="gift-mode" value={k} checked={f.giftMode === k} onChange={() => setF((s) => ({ ...s, giftMode: k }))} className="mt-1 h-4 w-4 accent-[#123F35]" />
                  <span><span className="block font-semibold text-ink">{label}</span><span className="block text-[13.5px] text-ink/75">{desc}</span></span>
                </label>
              ))}
              {err('giftMode') && <p role="alert" className="text-[13px] text-danger">{err('giftMode')}</p>}
              {f.giftMode === 'direct' && (
                <div className="mt-1 flex flex-col gap-4 border-t border-green/15 pt-4">
                  <div className="font-serif text-lg text-ink">{c.giftHeading}</div>
                  <Field id="co-gname" label={c.giftName} error={err('giftName')}>
                    <input id="co-gname" value={f.giftName} onChange={set('giftName')} className={inputCls(err('giftName'))} />
                  </Field>
                  <Field id="co-gemail" label={c.giftEmail} error={err('giftEmail')}>
                    <input id="co-gemail" type="email" dir="ltr" value={f.giftEmail} onChange={set('giftEmail')} className={inputCls(err('giftEmail'))} />
                  </Field>
                  <Field id="co-gmsg" label={c.giftMsg}>
                    <textarea id="co-gmsg" rows={3} maxLength={2000} value={f.giftMsg} onChange={set('giftMsg')} className={inputCls(false)} />
                  </Field>
                </div>
              )}
            </fieldset>
          )}
          {isSession && (
            <Field id="co-notes" label={c.notes}>
              <textarea id="co-notes" rows={3} maxLength={2000} value={f.notes} onChange={set('notes')} className={inputCls(false)} />
            </Field>
          )}
        </div>
        <div className="mt-6 flex gap-2.5">
          {at > 0 && <button type="button" onClick={() => setAt(at - 1)} className="btn-outline !px-5 !py-3.5">{c.back}</button>}
          <button type="button" onClick={nextFromDetails} className="btn-solid flex-1 !py-3.5">{c.continue}</button>
        </div>
      </>
    );
  } else if (step === 'verify') {
    const v = c.verify;
    body = (
      <>
        <h3 className="mb-1.5 font-serif text-[1.5rem] font-normal text-ink">{v.title}</h3>
        <p className="mb-5 text-[13.5px] text-ink/75">{v.lead}</p>
        <div className="flex flex-col gap-4">
          {needEmailVerify && (
            <CodeVerify kind="email" target={emailTarget} shown={f.email.trim()} lang={lang} v={v} done={emailDone}
              onVerified={(id) => setVer((s) => ({ ...s, email: { target: emailTarget, id } }))} />
          )}
          {needPhoneVerify && (
            <CodeVerify kind="phone" target={phoneTarget} shown={`+${phoneTarget}`} lang={lang} v={v} done={phoneDone}
              onVerified={(id) => setVer((s) => ({ ...s, phone: { target: phoneTarget, id } }))} />
          )}
        </div>
        {needEmailVerify && !emailDone && <p className="mt-3 text-[12.5px] text-ink/75">{v.wrongEmail}</p>}
        <div className="mt-6 flex gap-2.5">
          <button type="button" onClick={() => setAt(at - 1)} className="btn-outline !px-5 !py-3.5">{c.back}</button>
          <button type="button" disabled={!verified} onClick={() => setAt(at + 1)} className="btn-solid flex-1 !py-3.5">{c.continue}</button>
        </div>
      </>
    );
  } else if (step === 'pay') {
    const linkTo = isSession ? (f.dm === 'whatsapp' ? `WhatsApp ${waShown}` : f.email) : kind === 'workshop' ? (f.delivery === 'whatsapp' && user ? `WhatsApp ${dial} ${f.phone}` : f.email) : '';
    const rows = [
      [c.nameRow, f.name],
      [c.phoneRow, phoneDigits(f.phone) ? `${dial} ${f.phone}` : '—'],
      [c.emailRow, f.email],
      linkTo && [c.linkTo, linkTo],
      f.notes.trim() && [c.notesRow, f.notes.trim()],
      [isOrder ? c.orderItem : c.item, isSession && chosen.length > 1 ? `${title} × ${chosen.length}` : title],
      ...(isSession ? chosen.map((s, i) => [fill(c.sessionN, { n: i + 1 }), `${slotText(s)}${usd > 0 ? ` — ${price(usd)}` : ''}`]) : []),
      !isSession && workshopWhen && [c.when, workshopWhen],
      kind === 'gift' && [c.giftFor, f.giftMode === 'direct' ? `${f.giftName} · ${f.giftEmail}` : c.giftCardRow],
    ].filter(Boolean);
    const free = priceKnown && usd === 0;
    body = (
      <>
        <h3 className="mb-1 font-serif text-[1.4rem] font-normal text-ink">{c.confirmTitle}</h3>
        <p className="mb-3 text-[13px] text-ink/75">{c.confirmLead}</p>
        <dl className="mb-3 divide-y divide-green/10 rounded-lg border border-green/15">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3 px-3.5 py-2 text-[13.5px]">
              <dt className="w-[78px] shrink-0 text-ink/75">{k}</dt>
              <dd className="m-0 min-w-0 break-words text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        {!free && <p className="mb-2 rounded-md bg-sand/60 p-2.5 text-[12.5px] leading-relaxed text-ink/75">{payOnline ? c.payOnlineNext : c.payPending} 🔒 {c.payNever}{payOnline && settings.payment_test_mode ? ` ${c.test.note}` : ''}</p>}
        <p className="mb-1 text-[12px] text-ink/75">
          {c.agree} <Link to="/refunds" onClick={onClose}>{c.refund}</Link>.
        </p>
        {/* the total and the button stay at the bottom of the window, so "Proceed to payment" is always in view */}
        <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 mt-3 border-t border-green/15 bg-cream px-5 pb-5 pt-3 md:-bottom-7 md:-mx-7 md:-mb-7 md:px-7 md:pb-7">
          {serverErr && <p role="alert" className="mb-2 text-[13.5px] text-danger">{serverErr}</p>}
          <div className="mb-2.5 flex items-baseline justify-between gap-4">
            <span className="font-semibold text-ink">{c.total}</span>
            <span className="font-serif text-[22px] text-green">{totalLabel}</span>
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setAt(steps.indexOf('details'))} className="btn-outline !px-5 !py-3" disabled={busy}>{c.edit}</button>
            <button type="button" onClick={confirm} disabled={busy} className="btn-solid flex-1 !py-3">
              {busy ? (payOnline ? c.redirecting : c.saving)
                : free ? c.getFree : payOnline ? c.proceedPay : isSession || kind === 'workshop' ? c.confirm : c.placeOrder}
            </button>
          </div>
        </div>
      </>
    );
  } else if (step === 'card') {
    body = (
      <>
        <h3 className="mb-1.5 font-serif text-[1.5rem] font-normal text-ink">{c.cardTitle}</h3>
        <p className="mb-1 text-[14px] text-ink/70">{isSession && chosen.length > 1 ? `${title} × ${chosen.length}` : title}{isSession && chosen.length === 1 ? ` · ${whenText}` : workshopWhen ? ` · ${workshopWhen}` : ''}</p>
        {isSession && chosen.length > 1 && <ul className="mb-2 mt-1 list-none p-0 text-[13.5px] text-ink/70">{chosen.map((s) => <li key={s.key} className="mb-0.5">✓ {slotText(s)}</li>)}</ul>}
        <p className="mb-5 font-serif text-[22px] text-green">{totalLabel}</p>
        {card?.testMode && <TestCardForm card={card} lang={lang} onPaid={cardSubmitted} onFailed={() => setPayFail('')} />}
        {card && !card.testMode && <PaymobPixel key={card.clientSecret} publicKey={card.publicKey} clientSecret={card.clientSecret} lang={lang}
          onSubmitted={cardSubmitted} onFailed={cardFailed} />}
        <p className="mt-4 text-[12px] text-ink/75">🔒 {c.payNever}</p>
        <p className="mt-2 text-[12px] text-ink/75">{c.cardSaved}</p>
      </>
    );
  } else {
    const th = a.thanks;
    const settled = !!paid || result?.status === 'confirmed';
    const isFreeOrder = Number(result?.amount_usd) === 0 && !isSession;
    const vars = {
      name: f.name.trim().split(/\s+/)[0] || '', when: whenText, item: title, email: f.email, ref: result?.ref || '',
      to: kind === 'gift' ? f.giftName : (isSession && f.dm === 'whatsapp' ? `WhatsApp ${waShown}` : f.email),
      via: a.delivery[isSession ? f.dm : f.delivery],
    };
    const thanksKey = isFreeOrder ? 'free' : isSession ? 'session' : kind === 'gift' && f.giftMode === 'card' ? 'giftCard' : kind === 'workshop' ? (user ? 'workshopUser' : 'workshopGuest') : kind;
    const lead = settled
      ? `${fill(th.hi, vars)} ${fill(th[thanksKey], vars)}`
      : payOnline && result?.status === 'awaiting_payment' && card ? fill(c.notYetPaid, vars) : fill(th.saved, vars);
    const cals = isSession ? booked.map((b) => ({ start: zonedToUtc(b.s.date, b.s.time, settings.booking_timezone), ref: b.res.ref, label: slotText(b.s) }))
      : kind === 'workshop' && item.starts_at && result?.ref ? [{ start: new Date(item.starts_at), ref: result.ref, label: '' }] : [];
    const calMinutes = isSession ? minutesOf(settings.session_length) : minutesOf(item?.duration);
    const calTitle = isSession ? `${c.ctx.session} — Abir Diab` : `${title} — Abir Diab`;
    const when2 = (at2) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(at2);
    const calLinks = (cl) => (
      <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
        <a href={googleCalendarUrl({ title: calTitle, start: cl.start, minutes: calMinutes, details: `${c.ref}: ${cl.ref}` })} target="_blank" rel="noopener" className="!text-green underline underline-offset-4">{c.gcal}</a>
        <a href={icsDataUrl({ title: calTitle, start: cl.start, minutes: calMinutes, details: `${c.ref}: ${cl.ref}`, uid: cl.ref })} download={`abir-diab-${cl.ref}.ics`} className="!text-green underline underline-offset-4">{c.ics}</a>
      </span>
    );
    const linkCards = sessionPaid ? booked.filter((b) => links[b.res.ref]) : [];
    const isWorkshopDone = kind === 'workshop' && settled && !confirming && !payFail;
    const isCourseDone = kind === 'course' && settled && !confirming && !payFail;
    const isGiftDone = kind === 'gift' && settled && !confirming && !payFail;
    const showLead = confirming || (linkCards.length === 0 && !isWorkshopDone && !isCourseDone && !isGiftDone) || !!payFail;
    const guestNow = wasGuest && !user;
    const wsVia = f.delivery === 'whatsapp' && user ? `WhatsApp ${dial} ${f.phone}` : f.email;
    const land = kind === 'course' ? '/account?tab=learning' : kind === 'gift' ? '/account?tab=gifts' : kind === 'workshop' ? '/account?tab=workshops' : '/account?tab=sessions';
    // "View my booking": members go to their account; a guest goes to a one-step password screen there (never the usual sign-up form)
    const viewBooking = async () => {
      if (wasGuest && !user) {
        const has = hasAcct ?? await emailHasAccount(f.email.trim());
        savePending({ first: f.first.trim(), middle: f.middle.trim(), last: f.last.trim(), code: f.code, phone: f.phone, email: f.email.trim(), has });
      }
      onClose();
      navigate(land);
    };
    const viewLabel = kind === 'course' ? (guestNow ? c.cs.openGuest : c.cs.openMember) : kind === 'gift' ? (guestNow && f.giftMode !== 'direct' ? c.gf.openGuest : c.seeGifts) : th.viewBooking;
    body = (
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green text-[17px] text-cream" aria-hidden="true">✓</div>
          <h3 className="m-0 min-w-0 flex-1 font-serif text-[1.4rem] font-normal text-ink">
            {confirming ? c.ret.checking : settled ? c.thanksTitle : c.doneTitle.awaiting_payment}
          </h3>
          {!(isSession && booked.length > 1) && <span dir="ltr" className="shrink-0 font-mono text-[13px] font-semibold tracking-wider text-green" title={c.ref}>{result?.ref}</span>}
        </div>
        {showLead && <p className="mb-4 text-[14.5px] leading-relaxed text-ink/70">{confirming ? c.ret.processingLead : lead}</p>}
        {isWorkshopDone && (
          <div className="mb-4">
            <div className="mb-4 rounded-xl border border-green/15 bg-sand/60 p-4">
              <div className="text-[12px] font-semibold uppercase tracking-[.06em] text-terracotta">{c.ws.booked}</div>
              <div className="mt-1 font-serif text-[1.3rem] leading-snug text-ink">{title}</div>
              {workshopWhen && <div className="mt-1 text-[14.5px] font-semibold text-green">{workshopWhen}</div>}
              {item?.duration && <div className="mt-0.5 text-[13.5px] text-ink/70">{pick(item, 'format')}{pick(item, 'format') && pick(item, 'duration') ? ' · ' : ''}{pick(item, 'duration')}</div>}
            </div>
            <div className="mb-2 text-[13px] font-semibold text-ink/80">{c.ws.next}</div>
            <ol className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
              {[
                [c.ws.s1t, emailed ? fill(c.ws.s1Sent, { via: f.email }) : c.ws.s1Saved],
                [c.ws.s2t, fill(c.ws.s2, { via: wsVia })],
                [c.ws.s3t, c.ws.s3],
              ].map(([t1, t2], i) => (
                <li key={t1} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green text-[13px] font-semibold text-cream" aria-hidden="true">{i + 1}</span>
                  <span className="min-w-0 text-[14px] leading-relaxed text-ink/75"><span className="block font-semibold text-ink">{t1}</span>{t2}</span>
                </li>
              ))}
            </ol>
            {cals[0] && (
              <div className="mb-1">
                <div className="mb-2 text-[13px] font-semibold text-ink/80">{c.calTitle}</div>
                <div className="flex flex-wrap gap-2.5">
                  <a href={googleCalendarUrl({ title: calTitle, start: cals[0].start, minutes: calMinutes, details: `${c.ref}: ${cals[0].ref}` })} target="_blank" rel="noopener" className="btn-outline flex-1 !py-2.5 !text-[13.5px] no-underline">{c.gcal}</a>
                  <a href={icsDataUrl({ title: calTitle, start: cals[0].start, minutes: calMinutes, details: `${c.ref}: ${cals[0].ref}`, uid: cals[0].ref })} download={`abir-diab-${cals[0].ref}.ics`} className="btn-outline flex-1 !py-2.5 !text-[13.5px] no-underline">{c.ics}</a>
                </div>
              </div>
            )}
          </div>
        )}
        {isCourseDone && (
          <div className="mb-4">
            <div className="mb-4 rounded-xl border border-green/15 bg-sand/60 p-4">
              <div className="text-[12px] font-semibold uppercase tracking-[.06em] text-terracotta">{c.cs.unlocked}</div>
              <div className="mt-1 font-serif text-[1.3rem] leading-snug text-ink">{title}</div>
              {item?.type && <div className="mt-0.5 text-[13.5px] text-ink/70">{kindLabel(item.type)}</div>}
            </div>
            <div className="mb-2 text-[13px] font-semibold text-ink/80">{c.ws.next}</div>
            <ol className="m-0 mb-1 flex list-none flex-col gap-3 p-0">
              {[
                [c.cs.s1t, c.cs.s1],
                guestNow ? [c.cs.s2tGuest, c.cs.s2Guest] : [c.cs.s2tMember, c.cs.s2Member],
                [c.cs.s3t, c.cs.s3],
              ].map(([t1, t2], i) => (
                <li key={t1} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green text-[13px] font-semibold text-cream" aria-hidden="true">{i + 1}</span>
                  <span className="min-w-0 text-[14px] leading-relaxed text-ink/75"><span className="block font-semibold text-ink">{t1}</span>{t2}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {isGiftDone && (
          <div className="mb-4">
            <div className="mb-4 rounded-xl border border-green/15 bg-sand/60 p-4">
              <div className="text-[12px] font-semibold uppercase tracking-[.06em] text-terracotta">{c.gf.ready}</div>
              <div className="mt-1 font-serif text-[1.3rem] leading-snug text-ink">{title}</div>
              <div className="mt-0.5 text-[13.5px] text-ink/70">{f.giftMode === 'direct' ? fill(c.gf.forName, { name: f.giftName }) : c.gf.cardMode}</div>
            </div>
            {!result?.gift_token && (
              <>
                <div className="mb-2 text-[13px] font-semibold text-ink/80">{c.ws.next}</div>
                <ol className="m-0 mb-1 flex list-none flex-col gap-3 p-0">
                  {[
                    [c.gf.s1t, c.gf.s1],
                    f.giftMode === 'direct' ? [c.gf.s2tDirect, fill(c.gf.s2Direct, { name: f.giftName })] : guestNow ? [c.gf.s2tGuest, c.gf.s2Guest] : [c.gf.s2tMember, c.gf.s2Member],
                    [c.gf.s3t, f.giftMode === 'direct' ? c.gf.s3Direct : c.gf.s3Card],
                  ].map(([t1, t2], i) => (
                    <li key={t1} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green text-[13px] font-semibold text-cream" aria-hidden="true">{i + 1}</span>
                      <span className="min-w-0 text-[14px] leading-relaxed text-ink/75"><span className="block font-semibold text-ink">{t1}</span>{t2}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
        {payFail && (
          <div role="alert" className="mb-4 rounded-md border border-accent/50 bg-accent/10 p-4 text-[14px] text-ink">
            <p className="m-0 mb-3">{payFail}</p>
            <button type="button" onClick={retryPayment} disabled={busy} className="btn-solid w-full !py-3">{busy ? c.redirecting : c.tryAgain}</button>
          </div>
        )}
        {serverErr && <p role="alert" className="mb-4 rounded-md border border-accent/50 bg-accent/10 p-3 text-[13.5px] text-ink">{serverErr}</p>}
        {linkCards.length > 0 && (
          <>
            <p className="mb-3 text-[14.5px] leading-relaxed text-ink/80">{c.sent.emailed}</p>
            <details className="group mb-4 rounded-md border border-green/25 bg-green/5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-[14px] font-semibold text-green [&::-webkit-details-marker]:hidden">
                <span>{c.sent.show} ({linkCards.length})</span>
                <span aria-hidden="true" className="transition group-open:rotate-180">▾</span>
              </summary>
              <div className="flex flex-col gap-3 border-t border-green/15 p-3.5">
                {linkCards.map((b) => {
                  const cl = cals.find((x) => x.ref === b.res.ref);
                  return (
                    <div key={b.res.ref}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px] font-semibold text-ink">
                        <span>{c.ctx.session} · {slotText(b.s)}</span>
                        {booked.length > 1 && <span dir="ltr" className="font-mono text-[12.5px] tracking-wider text-green">{b.res.ref}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div dir="ltr" className="min-w-0 flex-1 basis-[200px] truncate rounded bg-white px-2.5 py-2 font-mono text-[12.5px]" title={links[b.res.ref]}>{links[b.res.ref]}</div>
                        <button type="button" className="btn-solid !px-4 !py-2 !text-[13.5px]"
                          onClick={() => { navigator.clipboard?.writeText(links[b.res.ref]).then(() => { setCopiedRef(b.res.ref); setTimeout(() => setCopiedRef(''), 2000); }).catch(() => {}); }}>
                          {copiedRef === b.res.ref ? c.copied : c.copyLink}
                        </button>
                        {joinState(b.s.at, now) === 'open'
                          ? <a href={links[b.res.ref]} target="_blank" rel="noopener noreferrer" className="btn-outline !px-4 !py-2 text-center !text-[13.5px] no-underline">{c.joinNow}</a>
                          : <button type="button" disabled aria-disabled="true" className="btn-outline cursor-not-allowed !px-4 !py-2 !text-[13.5px] opacity-45">{c.joinNow}</button>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12.5px] text-ink/75">
                        {joinState(b.s.at, now) === 'early' ? <span role="status">{fill(c.joinLocked, { when: when2(joinOpensAt(b.s.at)) })}</span> : <span />}
                        {cl && calLinks(cl)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </>
        )}
        {linkCards.length === 0 && cals.length > 0 && !isWorkshopDone && (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink/75">
            <span>{c.calTitle}</span>{calLinks(cals[0])}
          </div>
        )}
        {kind === 'gift' && result?.gift_token && (
          <div className="mb-4 rounded-md border border-green/20 bg-white p-4">
            {f.giftMode === 'direct' ? (
              <p className="m-0 text-[14.5px] leading-relaxed text-ink/75">{fill(c.giftDirectDone, { name: f.giftName })}</p>
            ) : (
              <>
                <div className="mb-1 font-serif text-lg text-ink">{c.giftLinkTitle}</div>
                <p className="mb-3 text-[13.5px] leading-relaxed text-ink/75">{c.giftLinkNote}</p>
                <div dir="ltr" className="mb-3 break-all rounded bg-sand p-2.5 font-mono text-[12.5px]">{giftUrl(result.gift_token)}</div>
                <div className="flex gap-2.5">
                  <button type="button" className="btn-solid flex-1 !py-2.5 !text-[14px]"
                    onClick={() => { navigator.clipboard?.writeText(giftUrl(result.gift_token)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }}>
                    {copied ? c.copied : c.copyLink}
                  </button>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button type="button" className="btn-outline flex-1 !py-2.5 !text-[14px]" onClick={() => navigator.share({ title, url: giftUrl(result.gift_token) }).catch(() => {})}>{c.shareLink}</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {isFreeOrder && freeFile?.url && (
          <a href={freeFile.url} target="_blank" rel="noopener" className="btn-outline mb-3 w-full no-underline">{c.download}</a>
        )}
        <div className="flex flex-wrap gap-2.5">
          {settled || !payOnline ? <button type="button" onClick={viewBooking} className="btn-solid flex-1 !py-2.5 !text-[14px]">{viewLabel}</button> : null}
          <button type="button" onClick={onClose} className="btn-outline flex-1 !py-2.5 !text-[14px]">{c.close}</button>
        </div>
      </div>
    );
  }

  return (
    <Modal open onClose={onClose} title={title} closeLabel={t.testimonials.closeLbl}>
      <div className="mb-2 text-[12.5px] uppercase tracking-[.03em] text-terracotta">{c.ctx[kind]}</div>
      {step !== 'done' && <Steps steps={steps} at={at} c={c} />}
      {body}
    </Modal>
  );
}
