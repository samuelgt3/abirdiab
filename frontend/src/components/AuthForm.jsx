import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import copy from '../content/account.json';
import countries from '../content/countries.json';
import { useSite } from '../hooks/SiteContext.jsx';
import { joinName } from '../lib/names.js';
import { strongEnough } from '../lib/password.js';
import { phoneDigits } from '../lib/orders.js';
import { isEmail } from '../lib/newsletter.js';
import { loadSettings } from '../lib/orders.js';
import { supabase } from '../lib/supabase.js';
import Field, { inputCls } from './checkout/Field.jsx';

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 11l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
  </svg>
);

/**
 * The sign in / create account form, used both in the sign-in window and inside the booking confirmation page.
 * prefill = details already known (all editable) · intro = one line of context · onLinkClick = runs when a policy link is followed
 * onSignedIn = runs after a successful sign-in or sign-up that signs the visitor straight in.
 */
export default function AuthForm({ mode: initial = 'in', prefill, intro, onSignedIn, onLinkClick, onMode, hideGoogle = false }) {
  const { lang } = useSite();
  const a = copy[lang].auth;
  const [mode, setMode] = useState(initial);
  const { country } = useSite();
  const [f, setF] = useState({ first: '', middle: '', last: '', code: countries.some((x) => x.code === country) ? country : 'EG', phone: '', email: '', password: '', confirm: '', agree: false, news: false, ...(prefill || {}) });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [formErr, setFormErr] = useState('');
  const [googleOn, setGoogleOn] = useState(false); // works only once the admin has switched Google sign-in on
  useEffect(() => { loadSettings().then((s) => setGoogleOn(!!s.google_signin_enabled)); }, []);
  const up = mode === 'up';
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const base = import.meta.env.BASE_URL;
  const lk = (to, label) => <Link key={to} to={to} onClick={onLinkClick} className="!text-green underline underline-offset-4">{label}</Link>;
  const agreeText = a.agree.split(/(\{terms\}|\{privacy\})/).map((part, i) => (part === '{terms}' ? lk('/terms', a.terms) : part === '{privacy}' ? lk('/privacy', a.privacy) : <span key={i}>{part}</span>));
  const dial = countries.find((x) => x.code === f.code)?.dial || '';
  const flag = (cc) => String.fromCodePoint(...[...cc].map((ch) => 127397 + ch.charCodeAt(0)));

  async function submit(e) {
    e.preventDefault();
    setFormErr(''); setNote('');
    const er = {};
    if (up && (f.first.trim().length < 1 || f.last.trim().length < 1)) er.name = a.err.name;
    if (!isEmail(f.email)) er.email = a.err.email;
    if (up ? !strongEnough(f.password) : f.password.length < 1) er.password = a.err.password;
    if (up) {
      const d = phoneDigits(f.phone).length;
      if (d < 7 || d > 12) er.phone = a.err.phone;
      if (f.confirm !== f.password) er.confirm = a.err.confirm;
      if (!f.agree) er.agree = a.err.agree;
    }
    setErrors(er);
    if (Object.keys(er).length || !supabase) return;
    setBusy(true);
    const email = f.email.trim().toLowerCase();
    if (up) {
      const { data, error } = await supabase.auth.signUp({
        email, password: f.password,
        options: { data: { full_name: joinName(f.first, f.middle, f.last), phone: phoneDigits(f.phone).replace(/^0+/, ''), phone_dial: dial, country: f.code, marketing_opt_in: f.news, accepted_privacy_at: new Date().toISOString() }, emailRedirectTo: `${window.location.origin}${base}account` },
      });
      setBusy(false);
      if (error) { setFormErr(/registered|exists/i.test(error.message) ? a.err.exists : a.err.generic); return; }
      // an address that already has an account comes back with no identities (Supabase hides that on purpose)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { setFormErr(a.err.exists); return; }
      if (data.session) onSignedIn?.(); else setNote(a.checkEmail.replace('{email}', email));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
      setBusy(false);
      if (error) { setFormErr(/confirm/i.test(error.message) ? a.err.unconfirmed : a.err.invalid); return; }
      onSignedIn?.();
    }
  }

  async function google() {
    setFormErr('');
    if (!supabase) return;
    // until the owner has set Google up (and switched it on in the admin) a friendly message beats Supabase's raw error page
    if (!googleOn) { setFormErr(a.err.google); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
    if (error) setFormErr(a.err.google);
  }

  async function forgot() {
    setFormErr(''); setNote('');
    if (!isEmail(f.email)) { setErrors({ email: a.err.email }); return; }
    await supabase?.auth.resetPasswordForEmail(f.email.trim().toLowerCase(), { redirectTo: `${window.location.origin}${base}account` });
    setNote(a.resetSent);
  }

  return (
    <>
      {intro && <p role="status" className="mb-3 rounded-md border border-green/25 bg-green/5 p-3 text-[14px] leading-relaxed text-ink/80">{intro}</p>}
      {up && !intro && <p className="mb-3 text-[14px] text-ink/75">{a.leadUp}</p>}
      <div className="mb-4 mt-3 flex gap-2" role="tablist">
        {[['in', a.tabIn], ['up', a.tabUp]].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => { setMode(k); onMode?.(k); setFormErr(''); setNote(''); setErrors({}); }}
            className={`flex-1 rounded-full border px-4 py-2 text-[14px] ${mode === k ? 'border-green bg-green text-cream' : 'border-green/25 text-green'}`}>{l}</button>
        ))}
      </div>
      {!hideGoogle && (
        <>
          <button type="button" onClick={google}
            className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-md border border-green/25 bg-white px-4 py-3 text-[15px] font-semibold text-ink hover:bg-sand/50">
            <GoogleMark /> {up ? a.googleUp : a.googleIn}
          </button>
          <div className="mb-4 flex items-center gap-3 text-[12px] text-ink/75"><span className="h-px flex-1 bg-green/15" />{up ? a.orUp : a.orIn}<span className="h-px flex-1 bg-green/15" /></div>
        </>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {up && (
          <Field id="au-first" label={a.name} error={errors.name}>
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
              <input id="au-first" aria-label={a.first} placeholder={a.first} autoComplete="given-name" value={f.first} onChange={set('first')} className={inputCls(errors.name)} />
              <input id="au-middle" aria-label={a.middle} placeholder={a.middle} autoComplete="additional-name" value={f.middle} onChange={set('middle')} className={inputCls(false)} />
              <input id="au-last" aria-label={a.last} placeholder={a.last} autoComplete="family-name" value={f.last} onChange={set('last')} className={inputCls(errors.name)} />
            </div>
          </Field>
        )}
        {up && (
          <Field id="au-phone" label={a.phone} error={errors.phone} hint={a.phoneHint}>
            <div dir="ltr" className="flex gap-2">
              <select aria-label={a.code} value={f.code} onChange={set('code')} className={`${inputCls(false)} !w-[118px] shrink-0 !px-2`}>
                {countries.map((x) => <option key={x.code} value={x.code}>{flag(x.code)} {x.dial}</option>)}
              </select>
              <input id="au-phone" type="tel" inputMode="tel" autoComplete="tel-national" value={f.phone} onChange={set('phone')} className={`${inputCls(errors.phone)} min-w-0 flex-1`} />
            </div>
          </Field>
        )}
        <Field id="au-email" label={a.email} error={errors.email}>
          <input id="au-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={f.email} onChange={set('email')} className={inputCls(errors.email)} />
        </Field>
        <Field id="au-pass" label={a.password} error={errors.password} hint={up ? a.passwordHint : undefined}>
          <input id="au-pass" type="password" autoComplete={up ? 'new-password' : 'current-password'} dir="ltr" value={f.password} onChange={set('password')} className={inputCls(errors.password)} />
        </Field>
        {up && (
          <Field id="au-confirm" label={a.confirm} error={errors.confirm}>
            <input id="au-confirm" type="password" autoComplete="new-password" dir="ltr" value={f.confirm} onChange={set('confirm')} className={inputCls(errors.confirm)} />
          </Field>
        )}
        {up && (
          <div className="flex flex-col gap-2.5 text-[13.5px] text-ink/75">
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={f.agree} onChange={set('agree')} className="mt-1 h-4 w-4 shrink-0 accent-green" />
              <span>{agreeText}</span>
            </label>
            {errors.agree && <p role="alert" className="m-0 text-danger">{errors.agree}</p>}
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={f.news} onChange={set('news')} className="mt-1 h-4 w-4 shrink-0 accent-green" />
              <span>{a.news}</span>
            </label>
          </div>
        )}
        {formErr && <p role="alert" className="text-[13.5px] text-danger">{formErr}</p>}
        {note && <p role="status" className="text-[13.5px] font-semibold text-green">{note}</p>}
        <button type="submit" disabled={busy} className="btn-solid !py-3.5">{up ? a.submitUp : a.submitIn}</button>
        {!up && <button type="button" onClick={forgot} className="text-[13.5px] text-green underline underline-offset-4">{a.forgot}</button>}
      </form>
    </>
  );
}
