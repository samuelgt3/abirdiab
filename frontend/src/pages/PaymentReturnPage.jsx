import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import copy from '../content/checkout.json';
import Layout from '../components/Layout.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { getOrderStatus, getBookingPage } from '../lib/orders.js';
import { format } from '../lib/pricing.js';

const PAID = ['paid', 'confirmed', 'completed'];
const POLL_MS = 2500;
const POLL_MAX = 12; // ~30 s

/**
 * Where Paymob sends the customer back (redirection_url). The query string from Paymob is NOT trusted:
 * the page asks the database, which only changes after the HMAC-verified webhook.
 */
export default function PaymentReturnPage() {
  const { lang } = useSite();
  const c = copy[lang];
  const r = c.ret;
  const [params] = useSearchParams();
  const ref = (params.get('ref') || '').toUpperCase();
  const paymobSaysFailed = params.get('success') === 'false';
  const [order, setOrder] = useState(undefined); // undefined = loading, null = not found
  const [tries, setTries] = useState(0);
  const [booking, setBooking] = useState(null); // the booking page data (holds the video link for 1:1 sessions)
  const [linkTries, setLinkTries] = useState(0);
  const isPaid = !!order && PAID.includes(order.status);
  const isSession = order?.kind === 'session';

  useEffect(() => {
    let alive = true;
    let timer;
    const check = async (n) => {
      const o = await getOrderStatus(ref);
      if (!alive) return;
      setOrder(o);
      setTries(n);
      // keep waiting for the webhook unless it's settled, or Paymob told us it failed
      // the booking is created when Paymob confirms the payment, so it may not exist yet: keep waiting
      if ((!o || !PAID.includes(o.status)) && !paymobSaysFailed && n < POLL_MAX) timer = setTimeout(() => check(n + 1), POLL_MS);
    };
    if (/^AD-[0-9A-Z]{6,12}$/.test(ref)) check(1); else setOrder(null);
    return () => { alive = false; clearTimeout(timer); };
  }, [ref, paymobSaysFailed]);

  // Once paid, fetch the joining link. It is made just after the payment is confirmed, so retry for a few seconds.
  useEffect(() => {
    if (!isPaid || !['session', 'workshop'].includes(order.kind)) return undefined;
    let alive = true;
    let timer;
    const load = async (n) => {
      const b = await getBookingPage(ref);
      if (!alive) return;
      setBooking(b);
      setLinkTries(n);
      if (isSession && !b?.join_url && n < 6) timer = setTimeout(() => load(n + 1), 2500);
    };
    load(1);
    return () => { alive = false; clearTimeout(timer); };
  }, [isPaid, isSession, ref, order?.kind]);

  const amount = order?.charge_amount_cents ? format(order.charge_amount_cents / 100, order.charge_currency, lang) : '';
  let state = 'checking';
  if (order && PAID.includes(order.status)) state = 'paid';
  else if (paymobSaysFailed || order?.status === 'cancelled') state = 'failed';
  else if (order === undefined) state = 'checking';
  else if (!/^AD-[0-9A-Z]{6,12}$/.test(ref)) state = 'missing';
  else if (tries >= POLL_MAX) state = 'processing';

  const icon = { paid: '✓', failed: '!', processing: '…', checking: '…', missing: '?' }[state];
  const tone = state === 'paid' ? 'bg-green text-cream' : state === 'failed' ? 'bg-accent text-ink' : 'bg-sand text-green';

  return (
    <Layout>
      <section className="mx-auto max-w-[560px] px-5 py-16 text-center md:py-24" aria-live="polite">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-semibold ${tone}`} aria-hidden="true">{icon}</div>
        <h1 className="mb-3 font-serif text-[2rem] font-normal text-ink">
          {state === 'missing' ? r.missing : r[state]}
        </h1>
        {state === 'paid' && <p className="mb-6 text-[16px] leading-relaxed text-ink/70">{r.paidLead.replace('{item}', order.item_title)}</p>}
        {state === 'processing' && <p className="mb-6 text-[16px] leading-relaxed text-ink/70">{r.processingLead}</p>}
        {state === 'failed' && <p className="mb-6 text-[16px] leading-relaxed text-ink/70">{r.failedLead}</p>}

        {order && (
          <div className="mx-auto mb-7 max-w-sm rounded-md border border-green/15 bg-sand p-4 text-start">
            <div className="text-[12px] uppercase tracking-[.03em] text-terracotta">{c.ref}</div>
            <div dir="ltr" className="font-mono text-xl font-semibold tracking-wider text-green">{order.ref}</div>
            <div className="mt-2 text-[14px] text-ink/75">{order.item_title}{amount ? ` · ${amount}` : ''}</div>
          </div>
        )}

        {state === 'paid' && isSession && (
          <div className="mx-auto mb-7 max-w-sm rounded-md border border-green/15 bg-white p-4 text-start">
            <div className="mb-2 text-[12px] uppercase tracking-[.03em] text-terracotta">{r.joinTitle}</div>
            {booking?.join_url ? (
              <>
                <a href={booking.join_url} target="_blank" rel="noopener noreferrer" className="btn-solid mb-2 inline-block !text-cream no-underline">{r.joinOpen}</a>
                <div dir="ltr" className="break-all text-[13px] text-ink/60">{booking.join_url}</div>
              </>
            ) : (
              <p className="text-[14px] leading-relaxed text-ink/70">{linkTries >= 6 ? r.joinLater : r.joinWait}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {state === 'paid' && ['session', 'workshop'].includes(order.kind) && <Link to={`/booking/${order.ref}`} className="btn-solid !text-cream no-underline">{r.bookingPage}</Link>}
          {state === 'failed' && <Link to="/" className="btn-solid !text-cream no-underline">{c.tryAgain}</Link>}
          {state === 'processing' && <button type="button" onClick={() => window.location.reload()} className="btn-solid">{r.refresh}</button>}
          <Link to="/" className="btn-outline no-underline">{r.home}</Link>
        </div>
      </section>
    </Layout>
  );
}
