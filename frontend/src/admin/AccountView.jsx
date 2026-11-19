import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Badge, Card, Icon, PageHeader } from './ui.jsx';

/** The signed-in admin: who they are, and a safe way to change the password. */
export default function AccountView({ session, toast }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const email = session?.user?.email || '';

  async function change(e) {
    e.preventDefault();
    setErr('');
    if (pw.length < 10) return setErr('Use at least 10 characters.');
    if (!/[a-z]/i.test(pw) || !/\d/.test(pw)) return setErr('Include letters and at least one number.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    setBusy(true);
    const r = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (r.error) return setErr(r.error.message);
    setPw('');
    setPw2('');
    return toast('Password changed');
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="My account" sub="Your sign-in for this admin area." />
      <Card className="mb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green/10 text-green"><Icon name="user" size={22} /></span>
          <div className="min-w-0">
            <div className="truncate font-semibold" dir="ltr">{email}</div>
            <Badge tone="green"><Icon name="check" size={12} /> Administrator</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 mt-0 font-serif text-[1.25rem] font-normal">Change password</h2>
        <p className="mb-3 mt-0 text-[14px] text-ink/65">Pick something only you know. A password manager is the easiest way.</p>
        <form onSubmit={change} noValidate>
          <label className="label" htmlFor="pw1">New password</label>
          <input id="pw1" type={show ? 'text' : 'password'} autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
          <label className="label" htmlFor="pw2">Type it again</label>
          <input id="pw2" type={show ? 'text' : 'password'} autoComplete="new-password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <label className="mt-3 flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
          </label>
          {err && <p role="alert" className="mb-0 mt-3 font-semibold text-danger">{err}</p>}
          <div className="mt-4"><button type="submit" className="btn-solid !py-2" disabled={busy || !pw}>{busy ? 'Saving…' : 'Change password'}</button></div>
        </form>
      </Card>
    </div>
  );
}
