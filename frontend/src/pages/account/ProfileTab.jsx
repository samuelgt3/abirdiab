import { useState } from 'react';
import { inputCls } from '../../components/checkout/Field.jsx';
import { useAuth } from '../../hooks/AuthContext.jsx';
import { useSite } from '../../hooks/SiteContext.jsx';
import acct from '../../content/account.json';
import countries from '../../content/countries.json';
import { phoneDigits } from '../../lib/orders.js';
import { strongEnough } from '../../lib/password.js';
import { supabase } from '../../lib/supabase.js';

/** Settings: your name and your password. That's all. */
export default function ProfileTab({ p, user, name }) {
  const s = p.settings;
  const { signOut } = useAuth();
  const { lang } = useSite();
  const [fullName, setFullName] = useState(name || '');
  const md = user.user_metadata || {};
  const [phone, setPhone] = useState(md.phone || '');
  const [code, setCode] = useState(countries.some((x) => x.code === md.country) ? md.country : 'EG');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState('');
  const [del, setDel] = useState({ open: false, text: '', err: '' });

  async function saveName(e) {
    e.preventDefault();
    setBusy('name'); setMsg({});
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim(), phone: phoneDigits(phone).replace(/^0+/, ''), phone_dial: countries.find((x) => x.code === code)?.dial || '', country: code } });
    setBusy('');
    setMsg(error ? { k: 'name', err: s.error } : { k: 'name', ok: s.saved });
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!strongEnough(pw)) { setMsg({ k: 'pw', err: s.short }); return; }
    if (pw !== pw2) { setMsg({ k: 'pw', err: s.mismatch }); return; }
    setBusy('pw'); setMsg({});
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy('');
    if (error) { setMsg({ k: 'pw', err: s.error }); return; }
    setPw(''); setPw2(''); setMsg({ k: 'pw', ok: s.updated });
  }

  async function deleteAccount() {
    setBusy('del'); setDel((d) => ({ ...d, err: '' }));
    const r = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
    setBusy('');
    if (r.error || !r.data?.deleted) { setDel((d) => ({ ...d, err: s.deleteFailed })); return; }
    await signOut();
    window.location.assign(import.meta.env.BASE_URL);
  }

  const note = (k) => msg.k === k && (msg.ok || msg.err) && (
    <p role={msg.ok ? 'status' : 'alert'} className={`mb-0 mt-3 text-[13.5px] ${msg.ok ? 'text-green' : 'text-danger'}`}>{msg.ok || msg.err}</p>
  );

  return (
    <div className="flex max-w-[420px] flex-col gap-10">
      <form onSubmit={saveName} noValidate>
        <label className="label !mt-0" htmlFor="pf-name">{s.name}</label>
        <input id="pf-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls(false)} />
        <label className="label" htmlFor="pf-phone">{acct[lang].auth.phone}</label>
        <div dir="ltr" className="flex gap-2">
          <select aria-label={acct[lang].auth.code} value={code} onChange={(e) => setCode(e.target.value)} className={`${inputCls(false)} !w-[118px] shrink-0 !px-2`}>
            {countries.map((x) => <option key={x.code} value={x.code}>{x.dial} · {x.code}</option>)}
          </select>
          <input id="pf-phone" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls(false)} min-w-0 flex-1`} />
        </div>
        <small dir="ltr" className="mt-1 block text-ink/75" style={{ textAlign: 'start' }}>{user.email}</small>
        <div className="mt-4"><button type="submit" disabled={busy === 'name'} className="btn-solid !py-2.5">{s.save}</button></div>
        {note('name')}
      </form>

      <form onSubmit={savePassword} noValidate>
        <h2 className="m-0 mb-1 font-serif text-[1.2rem] font-normal text-ink">{s.password}</h2>
        <label className="label" htmlFor="pf-pw">{s.newPassword}</label>
        <input id="pf-pw" type="password" dir="ltr" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls(false)} />
        <label className="label" htmlFor="pf-pw2">{s.confirmPassword}</label>
        <input id="pf-pw2" type="password" dir="ltr" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls(false)} />
        <div className="mt-4"><button type="submit" disabled={busy === 'pw' || !pw} className="btn-outline !py-2.5">{s.update}</button></div>
        {note('pw')}
      </form>

      <section className="border-t border-green/15 pt-6">
        <h2 className="m-0 mb-1 font-serif text-[1.2rem] font-normal text-ink">{s.deleteTitle}</h2>
        {!del.open ? (
          <button type="button" onClick={() => setDel({ open: true, text: '', err: '' })} className="text-[14px] text-danger underline underline-offset-4">{s.deleteTitle}</button>
        ) : (
          <div>
            <p className="mb-3 mt-1 text-[13.5px] leading-relaxed text-ink/75">{s.deleteWarn}</p>
            <label className="label" htmlFor="pf-del">{s.deleteType}</label>
            <input id="pf-del" dir="ltr" autoComplete="off" value={del.text} onChange={(e) => setDel((d) => ({ ...d, text: e.target.value }))} className={inputCls(false)} />
            {del.err && <p role="alert" className="mb-0 mt-2 text-[13.5px] text-danger">{del.err}</p>}
            <button type="button" disabled={del.text !== 'DELETE' || busy === 'del'} onClick={deleteAccount} className="mt-3 rounded-full bg-danger px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40">{s.deleteBtn}</button>
          </div>
        )}
      </section>

      {/* the left menu has Sign out on a computer; on a phone it lives here */}
      <button type="button" onClick={signOut} className="self-start text-[14.5px] text-ink/75 underline underline-offset-4 md:hidden">{acct[lang].signOut}</button>
    </div>
  );
}
