import { useState } from 'react';
import { Link } from 'react-router-dom';
import acct from '../content/account.json';
import countries from '../content/countries.json';
import quick from '../content/quick.json';
import { useSite } from '../hooks/SiteContext.jsx';
import { joinName } from '../lib/names.js';
import { phoneDigits } from '../lib/orders.js';
import { isEmail } from '../lib/newsletter.js';
import { strongEnough } from '../lib/password.js';
import { supabase } from '../lib/supabase.js';
import Field, { inputCls } from './checkout/Field.jsx';

export const PENDING_KEY = 'abir-pending';
export const readPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch { return null; } };
export const savePending = (p) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* private mode */ } };
export const clearPending = () => { try { localStorage.removeItem(PENDING_KEY); } catch { /* private mode */ } };

/**
 * The one-step screen a customer sees after pressing "View my booking" as a guest. Not the usual sign-up form:
 * a new customer sees their name and email and only has to choose a password; someone who already has an account
 * sees their email filled in and only has to type their password.
 * pending = { first, middle, last, code, phone, email, has }
 */
export default function QuickAccess({ pending, onDone }) {
  const { lang } = useSite();
  const q = quick[lang];
  const a = acct[lang].auth;
  const [has, setHas] = useState(!!pending.has); // true = the email already has an account
  const [f, setF] = useState({ name: joinName(pending.first, pending.middle, pending.last), email: pending.email || '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState({});
  const [formErr, setFormErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const dial = countries.find((x) => x.code === pending.code)?.dial || '';
  const base = import.meta.env.BASE_URL;

  async function submit(e) {
    e.preventDefault();
    setFormErr(''); setNote('');
    const er = {};
    if (!has && f.name.trim().length < 2) er.name = a.err.name;
    if (!isEmail(f.email)) er.email = a.err.email;
    if (has ? f.password.length < 1 : !strongEnough(f.password)) er.password = has ? a.err.password : q.pwRule;
    if (!has && f.confirm !== f.password) er.confirm = q.errMatch;
    setErr(er);
    if (Object.keys(er).length || !supabase) return;
    setBusy(true);
    const email = f.email.trim().toLowerCase();
    if (!has) {
      const { data, error } = await supabase.auth.signUp({
        email, password: f.password,
        options: {
          data: { full_name: f.name.trim(), phone: phoneDigits(pending.phone).replace(/^0+/, ''), phone_dial: dial, country: pending.code, accepted_privacy_at: new Date().toISOString() },
          emailRedirectTo: `${window.location.origin}${base}account`,
        },
      });
      setBusy(false);
      const exists = (error && /registered|exists/i.test(error.message)) || (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
      if (exists) { setHas(true); setFormErr(q.existsNow); return; }
      if (error) { setFormErr(a.err.generic); return; }
      if (data.session) { clearPending(); onDone?.(); } else setNote(a.checkEmail.replace('{email}', email));
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
    setBusy(false);
    if (error) { setFormErr(/confirm/i.test(error.message) ? a.err.unconfirmed : a.err.invalid); return; }
    clearPending();
    onDone?.();
  }

  async function forgot() {
    setFormErr(''); setNote('');
    if (!isEmail(f.email)) { setErr({ email: a.err.email }); return; }
    await supabase?.auth.resetPasswordForEmail(f.email.trim().toLowerCase(), { redirectTo: `${window.location.origin}${base}account` });
    setNote(a.resetSent);
  }

  const firstName = (f.name || '').trim().split(/\s+/)[0];
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-green/15 bg-white p-6 shadow-[0_18px_40px_rgba(18,63,53,.10)] md:p-8">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green text-[20px] text-cream" aria-hidden="true">✓</div>
      <h1 className="mb-1.5 font-serif text-[1.7rem] font-normal text-ink">{has ? q.titleIn : q.titleUp.replace('{name}', firstName ? `, ${firstName}` : '')}</h1>
      <p className="mb-5 text-[14.5px] leading-relaxed text-ink/70">{has ? q.leadIn : q.leadUp}</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {!has && (
          <Field id="qa-name" label={q.name} error={err.name}>
            <input id="qa-name" autoComplete="name" value={f.name} onChange={set('name')} className={inputCls(err.name)} />
          </Field>
        )}
        <Field id="qa-email" label={q.email} error={err.email}>
          <input id="qa-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={f.email} onChange={set('email')} className={inputCls(err.email)} />
        </Field>
        <Field id="qa-pass" label={has ? q.passwordIn : q.passwordUp} error={err.password} hint={has ? undefined : q.pwRule}>
          <div className="relative">
            <input id="qa-pass" type={show ? 'text' : 'password'} autoComplete={has ? 'current-password' : 'new-password'} dir="ltr" autoFocus
              value={f.password} onChange={set('password')} className={`${inputCls(err.password)} pe-16`} />
            <button type="button" onClick={() => setShow((x) => !x)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[12.5px] text-green underline underline-offset-4">{show ? q.hide : q.show}</button>
          </div>
        </Field>
        {!has && (
          <Field id="qa-confirm" label={q.confirm} error={err.confirm}>
            <input id="qa-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" dir="ltr" value={f.confirm} onChange={set('confirm')} className={inputCls(err.confirm)} />
          </Field>
        )}
        {formErr && <p role="alert" className="m-0 text-[13.5px] text-danger">{formErr}</p>}
        {note && <p role="status" className="m-0 text-[13.5px] font-semibold text-green">{note}</p>}
        <button type="submit" disabled={busy} className="btn-solid !py-3.5">{busy ? q.working : has ? q.submitIn : q.submitUp}</button>
        {has && <button type="button" onClick={forgot} className="text-[13.5px] text-green underline underline-offset-4">{a.forgot}</button>}
      </form>
      {!has && (
        <p className="mb-0 mt-4 text-[12.5px] leading-relaxed text-ink/70">
          {q.agreeA} <Link to="/terms" className="!text-green underline underline-offset-4">{q.terms}</Link> {q.and} <Link to="/privacy" className="!text-green underline underline-offset-4">{q.privacy}</Link>.
        </p>
      )}
      <p className="mb-0 mt-3 text-[12.5px] text-ink/70">
        <button type="button" onClick={() => { setHas((x) => !x); setFormErr(''); setNote(''); setErr({}); }} className="text-green underline underline-offset-4">{has ? q.switchUp : q.switchIn}</button>
      </p>
    </div>
  );
}
