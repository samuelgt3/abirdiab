import { useState } from 'react';
import copy from '../../content/checkout.json';
import { testPay } from '../../lib/orders.js';

/**
 * TEST MODE ONLY: a stand-in for Paymob's card form, shown while no real payment details are installed and the admin has
 * test mode on. The fields are fixed demo values (nothing real can be typed), and pressing the button books for real in the
 * system without taking any money.
 */
export default function TestCardForm({ card, lang, onPaid, onFailed }) {
  const c = copy[lang].test;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pay() {
    setBusy(true);
    setErr('');
    const r = await testPay({ p: card.p, sig: card.sig });
    setBusy(false);
    if (r.error) { setErr(c.failed); onFailed?.(r.error); return; }
    onPaid();
  }

  const field = 'rounded-md border border-green/20 bg-sand/60 px-3 py-2.5 text-[14.5px] text-ink/70';
  return (
    <div className="rounded-lg border-2 border-dashed border-accent/70 bg-accent/10 p-4">
      <div className="mb-1 text-[12px] font-bold uppercase tracking-[.05em] text-terracotta">{c.badge}</div>
      <p className="mb-3 mt-0 text-[13.5px] leading-relaxed text-ink/80">{c.lead}</p>
      <div className="mb-3 grid gap-2.5" aria-hidden="true">
        <div dir="ltr" className={field}>4242 4242 4242 4242</div>
        <div dir="ltr" className="grid grid-cols-2 gap-2.5"><div className={field}>12 / 30</div><div className={field}>123</div></div>
      </div>
      {err && <p role="alert" className="mb-3 mt-0 text-[13.5px] text-danger">{err}</p>}
      <button type="button" onClick={pay} disabled={busy} className="btn-solid w-full !py-3.5">{busy ? c.paying : c.pay}</button>
    </div>
  );
}
