import { useEffect, useRef, useState } from 'react';
import { checkCode, sendCode } from '../../lib/verify.js';

const fill = (s, vars) => Object.entries(vars).reduce((a, [k, v]) => a.replaceAll(`{${k}}`, v ?? ''), s);

/**
 * One verification box: asks for a code to be sent, takes the 6 digits, and reports success.
 * kind 'email' | 'phone'; target = what the code is checked against; shown = what the visitor sees ("+20 100 …").
 * Phone lets the visitor pick SMS or WhatsApp. `done` = already verified for this exact target.
 */
export default function CodeVerify({ kind, target, shown, lang, v, done, onVerified }) {
  const [channel, setChannel] = useState('sms');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [wait, setWait] = useState(0);
  const input = useRef(null);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  // the visitor changed the email / number after sending: start over
  useEffect(() => { setSent(false); setCode(''); setErr(''); }, [target]);
  useEffect(() => { if (sent) input.current?.focus(); }, [sent]);

  async function send() {
    setBusy(true); setErr('');
    const r = await sendCode({ kind, target, channel, lang });
    setBusy(false);
    if (r.error) { setErr(v.err[r.error] || v.err.send_failed); return; }
    setSent(true); setCode(''); setWait(30);
  }

  async function check(e) {
    e?.preventDefault();
    if (code.length < 4) { setErr(v.err.wrong_code); return; }
    setBusy(true); setErr('');
    const r = await checkCode({ kind, target, code });
    setBusy(false);
    if (r.error) { setErr(v.err[r.error] || v.err.wrong_code); if (r.error === 'expired' || r.error === 'too_many') setSent(false); return; }
    onVerified(r.id);
  }

  const title = kind === 'email' ? v.emailTitle : v.phoneTitle;
  return (
    <section className="rounded-lg border border-green/20 bg-white p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h4 className="m-0 font-serif text-[1.1rem] font-normal text-ink">{title}</h4>
        {done && <span className="rounded-full bg-green/10 px-2.5 py-0.5 text-[12px] font-semibold text-green">{v.verified}</span>}
      </div>
      <p dir="ltr" className="mb-3 mt-0 text-[14px] text-ink/70" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>{shown}</p>
      {!done && !sent && (
        <>
          {kind === 'phone' && (
            <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label={v.phoneHow}>
              {[['sms', v.sms], ['whatsapp', v.whatsapp]].map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={channel === k} onClick={() => setChannel(k)}
                  className={`rounded-full border px-4 py-2 text-[13.5px] ${channel === k ? 'border-green bg-green text-cream' : 'border-green/25 text-green'}`}>{label}</button>
              ))}
            </div>
          )}
          <button type="button" onClick={send} disabled={busy} className="btn-solid w-full !py-3">{busy ? v.sending : v.sendCode}</button>
        </>
      )}
      {!done && sent && (
        <form onSubmit={check} noValidate>
          <p className="mb-2 mt-0 text-[13.5px] text-ink/75">{fill(kind === 'email' ? v.emailSent : v.phoneSent, { to: shown })}</p>
          <label htmlFor={`code-${kind}`} className="label !mt-0">{v.codeLabel}</label>
          <input id={`code-${kind}`} ref={input} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="input text-center font-mono text-[1.4rem] tracking-[.35em]" />
          <div className="mt-3 flex gap-2.5">
            <button type="submit" disabled={busy || code.length < 4} className="btn-solid flex-1 !py-3">{busy ? v.verifying : v.verifyBtn}</button>
            <button type="button" onClick={send} disabled={busy || wait > 0} className="btn-outline !px-4 !py-3 !text-[13.5px]">
              {wait > 0 ? fill(v.resendIn, { s: wait }) : v.resend}
            </button>
          </div>
        </form>
      )}
      {err && <p role="alert" className="mb-0 mt-3 text-[13.5px] text-danger">{err}</p>}
    </section>
  );
}
