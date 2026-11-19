import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { chipCls } from '../components/chip.js';
import CourseCard from '../components/CourseCard.jsx';
import kinds from '../content/kinds.json';
import Layout, { BackLink } from '../components/Layout.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { assetUrl } from '../lib/content.js';
import { getCourseAccess } from '../lib/orders.js';
import { useCheckout } from '../components/checkout/CheckoutContext.jsx';
import { useCart } from '../hooks/CartContext.jsx';
import { usePageMeta } from '../lib/pageMeta.js';
import { findBySlug } from '../lib/slug.js';

const BUNNY_LIBRARY = import.meta.env.VITE_BUNNY_LIBRARY_ID;

function KindMark({ kind }) {
  if (kind === 'v') return <span className="text-[13.5px]">▶</span>;
  if (kind === 'a') {
    return (
      <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
        {[6, 12, 9, 14, 7].map((h, i) => <span key={i} className="w-[2px] rounded bg-current" style={{ height: h }} />)}
      </span>
    );
  }
  return <span className="text-[12px] font-bold">PDF</span>;
}

export default function CoursePage() {
  const { slug } = useParams();
  const { t, u, lang, content, pick, price, kindLabel } = useSite();
  const { buyCourse, giftCourse } = useCheckout();
  const { openChoice } = useCart();
  const c = t.courses;
  const course = content ? findBySlug(content.courses, slug) : null;
  usePageMeta({ title: course ? pick(course, 'title') : '', description: course ? String(pick(course, 'description') || '').slice(0, 155) : '', lang });
  const [inside, setInside] = useState('all'); // filter inside the course: all | v | a | p
  // free courses: the private file / video, handed out by the database (paid ones only appear in My courses after purchase)
  const [access, setAccess] = useState(null);
  const courseId = course?.id;
  const courseIsFree = !!course && (course.is_free || !course.price_usd);
  useEffect(() => {
    setAccess(null);
    if (courseId && courseIsFree) getCourseAccess(courseId).then(setAccess);
  }, [courseId, courseIsFree]);

  if (!content) return <Layout><p className="section-pad container-x text-ink/75">{u.loading}</p></Layout>;
  if (!course) {
    return (
      <Layout>
        <div className="section-pad container-x">
          <p className="mb-4 text-lg">{u.notFound}</p>
          <Link to="/materials">{c.viewAll}</Link>
        </div>
      </Layout>
    );
  }

  const isFree = course.is_free || !course.price_usd;
  const priceLabel = isFree ? u.free : price(course.price_usd);
  const items = course.pack_items || [];
  const wyg = lang === 'ar' && course.what_you_get_ar?.length ? course.what_you_get_ar : course.what_you_get || [];
  const embed = isFree && access?.video_id && BUNNY_LIBRARY
    ? `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY}/${access.video_id}` : null;
  const related = content.courses.filter((x) => x !== course && x.type === course.type).slice(0, 4);
  const it = (x, f) => (lang === 'ar' && x[`${f}_ar`]) || x[f] || '';
  // filter inside the course: only the kinds this course really has (v = video, a = audio, anything else = PDF)
  const kindOf = (x) => (x.kind === 'v' || x.kind === 'a' ? x.kind : 'p');
  const kindCount = items.reduce((m, x) => ({ ...m, [kindOf(x)]: (m[kindOf(x)] || 0) + 1 }), {});
  const presentKinds = ['v', 'a', 'p'].filter((k) => kindCount[k]);
  const activeKind = presentKinds.includes(inside) ? inside : 'all';
  const shownItems = items.map((x, i) => ({ x, i })).filter(({ x }) => activeKind === 'all' || kindOf(x) === activeKind);

  // the ONE main action on this page (paid -> on-site checkout; free -> download or free sign-up)
  const cta = !isFree
    ? <button type="button" onClick={() => openChoice(course)} className="btn-solid w-full !py-[15px] !text-[15.5px] hover:-translate-y-0.5">{c.unlockFull}</button>
    : access?.url
      ? <a href={access.url} target="_blank" rel="noopener" className="btn-solid w-full !py-[15px] !text-[15.5px] !text-cream no-underline">{c.download}</a>
      : <button type="button" onClick={() => buyCourse(course)} className="btn-solid w-full !py-[15px] !text-[15.5px]">{u.getFree}</button>;

  return (
    <Layout>
      {/* sticky bar: back + title + price (the action button lives once, in the price card) */}
      <div className="sticky z-[50] border-b border-green/15 bg-cream/95 backdrop-blur-md" style={{ top: 'var(--hdr-h, 64px)' }}>
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-5 py-2.5 md:px-8">
          <BackLink to="/materials" label={c.back} />
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="hidden truncate text-[14px] text-ink/70 sm:block">{pick(course, 'title')}</span>
            <span className="shrink-0 font-serif text-lg text-green">{priceLabel}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1160px] px-5 pb-24 pt-8 md:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          {/* info column */}
          <aside className="flex min-w-0 flex-col gap-4 lg:sticky" style={{ top: 'calc(var(--hdr-h, 64px) + 72px)' }}>
            <div className="flex flex-col gap-4 rounded-[10px] border border-green/15 bg-cream p-6 shadow-[0_12px_32px_rgba(18,63,53,.08)]">
              <div>
                <div className="mb-2 text-xs uppercase tracking-[.05em] text-terracotta">{pick(course, 'category')}</div>
                <div className="flex flex-col gap-1 text-sm text-ink/70">
                  <span>{pick(course, 'meta')}</span>
                  {items.length > 0 && <span>{items.length} {u.items}</span>}
                </div>
              </div>
              <div className="border-t border-green/15 pt-4">
                <div className="mb-0.5 text-xs text-ink/75">{c.finalPrice}</div>
                <div className="font-serif text-[34px] leading-[1.1] text-green">{priceLabel}</div>
              </div>
              {cta}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[.05em] text-ink">{c.access}</div>
                <span className="inline-block rounded-full border border-green/15 px-3.5 py-1.5 text-[13px] text-ink/75">
                  {course.downloadable ? c.download : c.portalOnly}
                </span>
              </div>
            </div>
            {!isFree && (
              <div className="flex flex-col gap-2.5 rounded-[10px] border border-green/15 bg-cream p-6 shadow-[0_12px_32px_rgba(18,63,53,.08)]">
                <h3 className="m-0 font-serif text-[1.45rem] font-normal leading-tight text-ink">{c.giftTitle}</h3>
                <p className="mb-1.5 text-[14.5px] leading-relaxed text-ink/75">{c.giftLead}</p>
                <button type="button" onClick={() => giftCourse(course)}
                  className="flex items-center gap-3.5 rounded-lg border border-green/30 py-2.5 pe-4 ps-2.5 text-start text-[15px] font-semibold text-green hover:bg-green/5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green text-cream" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
                    </svg>
                  </span>
                  {c.giftCta}
                </button>
              </div>
            )}
          </aside>

          {/* main column */}
          <div className="min-w-0">
            <div className="relative mb-9 aspect-video overflow-hidden rounded-lg bg-[#0D2E27]">
              {embed ? (
                <iframe title={pick(course, 'title')} src={embed} className="absolute inset-0 h-full w-full" allowFullScreen loading="lazy" />
              ) : (
                // no playable preview yet -> just the cover (a "Play teaser" label with nothing to play was misleading)
                <div role="img" aria-label={pick(course, 'title')} className="absolute inset-0 bg-cover bg-center opacity-[.8]"
                  style={{ backgroundImage: `url(${assetUrl(course.image_url)})` }} />
              )}
              {course.badge && <span className="absolute start-3 top-3 rounded-full bg-cream px-[11px] py-[5px] text-xs text-green">{pick(course, 'badge')}</span>}
              <span className="absolute end-3 top-3 rounded-full bg-green px-2.5 py-[5px] text-[12px] text-cream">{kindLabel(course.type)}</span>
            </div>

            <h1 className="mb-3.5 font-serif text-[1.95rem] font-normal leading-[1.22] text-ink">{pick(course, 'title')}</h1>
            <p className="mb-6 text-[15.5px] leading-[1.75] text-ink/75">{pick(course, 'full_description')}</p>
            {wyg.length > 0 && (
              <>
                <div className="mb-2.5 text-xs font-semibold uppercase tracking-[.05em] text-ink">{c.whatYouGet}</div>
                <ul className="mb-10 list-disc ps-[18px]">
                  {wyg.map((g) => <li key={g} className="mb-1 text-[14.5px] leading-[1.7] text-ink/75">{g}</li>)}
                </ul>
              </>
            )}

            {items.length > 0 && (
              <>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-5 border-b border-green/15 pb-3">
                  <h2 className="m-0 font-serif text-[1.5rem] font-normal text-ink">{c.inside}</h2>
                  <span className="text-[13px] text-ink/75">{shownItems.length} {u.items}</span>
                </div>
                {presentKinds.length > 1 && (
                  <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={c.inside}>
                    <button type="button" aria-pressed={activeKind === 'all'} onClick={() => setInside('all')} className={chipCls(activeKind === 'all')}>
                      {c.filterAll} <span className="opacity-70">{items.length}</span>
                    </button>
                    {presentKinds.map((k) => (
                      <button key={k} type="button" aria-pressed={activeKind === k} onClick={() => setInside(k)} className={chipCls(activeKind === k)}>
                        {kinds.inside[lang][k]} <span className="opacity-70">{kindCount[k]}</span>
                      </button>
                    ))}
                  </div>
                )}
                <ol className="flex flex-col gap-3">
                  {shownItems.map(({ x, i }) => (
                    <li key={i} className="flex items-center gap-4 rounded-lg border border-green/15 bg-cream p-4">
                      <span className="w-6 shrink-0 text-center font-serif text-ink/75 max-sm:hidden">{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-lg bg-[#DCE7E1] text-green"><KindMark kind={x.kind} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold text-ink">{it(x, 'title')}</div>
                        <div className="text-[13.5px] text-ink/75">{it(x, 'description')}</div>
                      </div>
                      <span className="shrink-0 text-xs text-ink/75">{it(x, 'length')}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-6 font-serif text-[1.6rem] font-normal text-ink">{u.related}</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {related.map((x) => <CourseCard key={x.id ?? x.title} course={x} variant="lms" />)}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
