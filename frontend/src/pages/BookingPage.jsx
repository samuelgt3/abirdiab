import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BookingCard from '../components/BookingCard.jsx';
import Layout from '../components/Layout.jsx';
import acct from '../content/account.json';
import { useAuth } from '../hooks/AuthContext.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { getBookingPage } from '../lib/orders.js';

/**
 * /booking/<reference> — the page a customer keeps. Shows the booking, and the joining link from 2 hours before the start.
 * Sessions work with the reference alone; workshop links additionally require the signed-in owner (guests get theirs by email).
 */
export default function BookingPage() {
  const { ref: raw } = useParams();
  const ref = String(raw || '').toUpperCase();
  const { lang } = useSite();
  const { user, openAuth } = useAuth();
  const c = acct[lang].booking;
  const [b, setB] = useState(undefined); // undefined loading, null not found

  const load = useCallback(async () => setB(await getBookingPage(ref)), [ref]);
  useEffect(() => { load(); }, [load, user?.id]);
  // while waiting for the release time (or for payment), look again every 30 s
  useEffect(() => {
    if (!b || b.released) return undefined;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [b, load]);

  return (
    <Layout>
      <section className="mx-auto max-w-[640px] px-5 py-12 md:py-16">
        <h1 className="mb-6 font-serif text-[2rem] font-normal text-ink">{c.title}</h1>
        {b === undefined && <p className="text-ink/75">…</p>}
        {b === null && <p className="text-ink/75">{c.notFound}</p>}
        {b && <BookingCard b={b} />}
        {b && b.released && !b.join_url && !b.mine && !user && (
          <button type="button" onClick={() => openAuth({ mode: 'in' })} className="btn-solid mt-4">{c.signInBtn}</button>
        )}
        <div className="mt-8"><Link to="/" className="btn-outline no-underline">{lang === 'ar' ? 'العودة إلى الموقع' : 'Back to the website'}</Link></div>
      </section>
    </Layout>
  );
}
