import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import acct from '../content/account.json';
import { useAuth } from '../hooks/AuthContext.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { assetUrl } from '../lib/content.js';
import { getGiftInfo, redeemGift } from '../lib/orders.js';

const fill = (s, v) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, x ?? ''), s);

/**
 * /gift/<token> — where a gift receiver lands. They see what they were given, sign in (or create an account),
 * and press one button: the course is added to My courses.
 */
export default function GiftPage() {
  const { token } = useParams();
  const { lang, kindLabel } = useSite();
  const { user, ready, openAuth } = useAuth();
  const g = acct[lang].giftPage;
  const [info, setInfo] = useState(undefined); // undefined loading, null not found
  const [result, setResult] = useState(null); // { title } | { error }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setInfo(await getGiftInfo(token)), [token]);
  useEffect(() => { load(); }, [load]);

  async function claim() {
    setBusy(true);
    const r = await redeemGift(token);
    setBusy(false);
    setResult(r);
    if (!r.error) load();
  }

  const course = info?.course;
  const title = course ? (lang === 'ar' && course.title_ar) || course.title : '';
  const claimed = result && !result.error;
  const status = claimed ? 'done' : result?.error === 'redeemed' ? 'redeemed' : result?.error === 'unpaid' ? 'unpaid' : info?.status;

  return (
    <Layout>
      <section className="mx-auto max-w-[560px] px-5 py-12 md:py-16">
        {info === undefined && <p className="text-ink/75">…</p>}
        {info === null && <h1 className="font-serif text-[1.5rem] font-normal leading-snug text-ink">{g.notFound}</h1>}
        {info && (
          <div className="overflow-hidden rounded-xl border border-green/15 bg-cream shadow-[0_12px_32px_rgba(18,63,53,.08)]">
            <div className="flex h-12 items-center justify-center bg-green text-[22px] text-cream" aria-hidden="true">🎁</div>
            {course.image_url && <img src={assetUrl(course.image_url)} alt="" className="h-48 w-full object-cover" />}
            <div className="p-6">
              <h1 className="mb-1 font-serif text-[1.8rem] font-normal leading-tight text-ink">{g.title}</h1>
              {info.sender_name && <p className="mb-4 text-[14.5px] text-ink/75">{fill(g.from, { name: info.sender_name })}</p>}
              <div className="mb-4 rounded-lg border border-green/15 bg-white p-4">
                <div className="text-[12px] uppercase tracking-[.04em] text-terracotta">{kindLabel(course.type)}</div>
                <div className="font-serif text-[1.3rem] text-ink">{title}</div>
              </div>
              {info.message && <blockquote dir="auto" className="mb-5 whitespace-pre-line border-s-2 border-gold ps-4 text-[15px] italic text-ink/75">{info.message}</blockquote>}

              {status === 'unpaid' && <p className="m-0 text-[15px] text-ink/75">{g.unpaid}</p>}
              {status === 'redeemed' && <p className="m-0 text-[15px] text-ink/75">{g.redeemed}</p>}
              {status === 'done' && (
                <>
                  <p className="mb-4 font-semibold text-green">{fill(g.success, { title })}</p>
                  <Link to="/account?tab=courses" className="btn-solid w-full !text-cream no-underline">{g.goCourses}</Link>
                </>
              )}
              {status === 'ready' && ready && !user && (
                <>
                  <button type="button" className="btn-solid w-full !py-3.5" onClick={() => openAuth({ mode: 'up', onSuccess: load })}>{g.signIn}</button>
                  <p className="mb-0 mt-3 text-[13px] text-ink/75">{g.signInNote}</p>
                </>
              )}
              {status === 'ready' && user && (
                <button type="button" className="btn-solid w-full !py-3.5" disabled={busy} onClick={claim}>{busy ? g.claiming : g.claim}</button>
              )}
              {result?.error && !['redeemed', 'unpaid'].includes(result.error) && <p role="alert" className="mt-3 text-[13.5px] text-danger">{g.err}</p>}
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}
