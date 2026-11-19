import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Card, PageHeader, Skeleton, Switch } from './ui.jsx';


function ToggleRow({ title, children, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-semibold">{title}</div>
        <p className="m-0 mt-0.5 max-w-lg text-[13.5px] text-ink/65">{children}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/** Booking, sign-in and payment settings. One Save button for everything. */
export default function SettingsView({ toast }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const initial = useRef('');
  const [status, setStatus] = useState(null); // which outside services are connected

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then((r) => {
      if (r.error) { setError(r.error.message); return; }
      const v = { ...r.data };
      initial.current = JSON.stringify(v);
      setS(v);
    });
  }, []);

  useEffect(() => {
    supabase.functions.invoke('setup-status').then((r) => setStatus(r.error ? { error: true } : r.data)).catch(() => setStatus({ error: true }));
  }, []);

  const dirty = s && JSON.stringify(s) !== initial.current;
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save(e) {
    e?.preventDefault();
    setSaving(true);
    const r = await supabase.from('site_settings').update({
      payments_enabled: !!s.payments_enabled,
      payment_test_mode: !!s.payment_test_mode,
      google_signin_enabled: !!s.google_signin_enabled,
      require_email_verification: !!s.require_email_verification,
      require_phone_verification: !!s.require_phone_verification,
      payment_currency: s.payment_currency,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    if (r.error) return toast(`Could not save: ${r.error.message}`, true);
    initial.current = JSON.stringify(s);
    return toast('Settings saved — live on the website now');
  }

  if (error) return <p className="font-semibold text-danger">Could not load: {error}</p>;
  if (!s) return <Skeleton rows={3} />;
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }));
  const flag = (k) => (v) => setS((x) => ({ ...x, [k]: v }));

  return (
    <form onSubmit={save} className="max-w-3xl pb-20">
      <PageHeader title="Booking & payments" sub="Sign-in and card payments. (Session price and times are under Sessions & availability.) Changes go live when you press Save." />

      <Card className="mb-5">
        <h2 className="mb-1 mt-0 font-serif text-[1.25rem] font-normal">Setup checklist</h2>
        <p className="mb-3 mt-0 text-[13.5px] text-ink/65">What is connected and what is still to do. You can connect these later; the website works without them (see each line).</p>
        {!status ? <Skeleton rows={3} /> : status.error ? <p className="m-0 text-[14px] text-ink/65">Could not check right now.</p> : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[14px]">
            {[
              ['Email sending (booking emails, codes)', status.email && status.email_from, 'Not connected: customers still see their link on screen and in My bookings, but no emails are sent. To connect: make a free account at resend.com, then in Supabase → Edge Functions → Secrets add RESEND_API_KEY and MAIL_FROM (details: docs/EMAILS.md).'],
              ['Workshop link reminders (2 hours before)', status.reminders, 'Not scheduled: workshop links still appear in My bookings 2 hours before, but are not emailed. Needs the email service above plus a CRON_SECRET and the 5-minute schedule (docs/EMAILS.md).'],
              ['SMS / WhatsApp phone codes', status.sms, 'Not connected: phone numbers are not verified. To connect: Twilio Verify keys (docs/VERIFICATION.md), then switch on "Verify phone" below.'],
              ['Card payments (Paymob)', status.paymob, 'Not connected: only test payments work (no money). To connect: add the Paymob keys in Supabase secrets (docs/PAYMENTS.md); test mode then turns itself off.'],
            ].map(([name, ok, todo]) => (
              <li key={name} className="flex gap-3">
                <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${ok ? 'bg-green text-cream' : 'bg-accent text-ink'}`}>{ok ? '✓' : '!'}</span>
                <div><div className="font-semibold">{name}: {ok ? 'connected' : 'not connected yet'}</div>{!ok && <p className="m-0 mt-0.5 text-[13.5px] text-ink/70">{todo}</p>}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-5">
        <h2 className="mb-3 mt-0 font-serif text-[1.25rem] font-normal">Customer sign-in</h2>
        <ToggleRow title="Show “Continue with Google”" checked={!!s.google_signin_enabled} onChange={flag('google_signin_enabled')}>
          Switch on only after Google is enabled in Supabase (Authentication → Sign In / Providers → Google) and tested. Email sign-in always works.
        </ToggleRow>
      </Card>

      <Card className="mb-5">
        <h2 className="mb-3 mt-0 font-serif text-[1.25rem] font-normal">Verify customers' email and phone</h2>
        <div className="flex flex-col gap-4">
          <ToggleRow title="Verify email with a code" checked={!!s.require_email_verification} onChange={flag('require_email_verification')}>
            Before booking, customers type a 6-digit code we email them, so a mistyped address can never slip through. Signed-in customers whose account email matches skip this. Switch on only after the email service key is added (docs/EMAILS.md), otherwise nobody can book.
          </ToggleRow>
          <ToggleRow title="Verify phone number with a code (SMS or WhatsApp)" checked={!!s.require_phone_verification} onChange={flag('require_phone_verification')}>
            Customers who give a phone number type a code sent by SMS or WhatsApp. Switch on only after the SMS provider (Twilio Verify) keys are added (docs/VERIFICATION.md), otherwise nobody who gives a number can book.
          </ToggleRow>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 mt-0 font-serif text-[1.25rem] font-normal">Card payments (Paymob)</h2>
        <ToggleRow title="Take card payments on the website" checked={!!s.payments_enabled} onChange={flag('payments_enabled')}>
          Switch on only after the Paymob keys are added in Supabase and a test payment worked. While off, nobody can pay, so bookings cannot be completed.
        </ToggleRow>
        <div className="mt-4">
          <ToggleRow title="Test payments (no real money)" checked={!!s.payment_test_mode} onChange={flag('payment_test_mode')}>
            While on, and only while no Paymob key is installed, the card step shows a pretend payment that books for real without taking money, so you can try the whole flow. <strong>Switch OFF before the website goes public.</strong>
          </ToggleRow>
        </div>
        <label className="label" htmlFor="s-cur">Currency customers are charged in</label>
        <select id="s-cur" className="input max-w-xs" value={s.payment_currency} onChange={set('payment_currency')}>
          {['EGP', 'USD', 'SAR', 'AED', 'OMR'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <small className="mt-1 block text-ink/60">
          Must be your Paymob account’s currency (usually EGP). Prices stay in US dollars on the site and are converted at that day’s rate, rounded up.
        </small>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-end gap-3 border-t border-green/15 bg-white/95 px-5 py-3 backdrop-blur lg:start-[250px]">
        <span className="text-[13px] text-ink/60">{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
        <button type="submit" className="btn-solid !py-2" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}
