import { Link } from 'react-router-dom';
import { useSite } from '../hooks/SiteContext.jsx';
import { assetUrl } from '../lib/content.js';
import { postPath } from '../lib/slug.js';

/** Home-page journal preview; each card opens its own article page. */
export default function Journal() {
  const { t, content, pick } = useSite();
  const j = t.journal;
  const posts = (content?.journal_posts || []).slice(0, 4);

  return (
    <section id="journal" className="section-pad scroll-mt-16 bg-sand">
      <div className="container-x">
        <div className="mb-10 flex items-baseline gap-4 border-b border-green/15 pb-3.5">
          <span className="kicker">{j.kicker}</span>
        </div>
        <h2 className="mb-6 font-serif text-[2rem] font-normal text-ink md:text-[2.3rem]">{j.title}</h2>
        <div className="grid overflow-hidden rounded-lg border border-green/15 bg-cream md:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.id ?? p.title} to={postPath(p)}
              className="group flex flex-col gap-2 border-b border-green/10 p-6 !text-ink no-underline transition hover:bg-green/[.05] md:p-7 md:[&:nth-child(odd)]:border-e">
              {p.image_url && <img src={assetUrl(p.image_url)} alt="" loading="lazy" className="mb-1 aspect-[16/9] w-full rounded-md object-cover" />}
              <span className="text-[12.5px] text-terracotta">{pick(p, 'category')} · {pick(p, 'read_time')}</span>
              <span className="font-serif text-[21px] leading-snug">{pick(p, 'title')}</span>
              <span className="text-[14.5px] leading-relaxed text-ink/70">{pick(p, 'excerpt')}</span>
              <span className="mt-1 text-[14px] font-semibold text-green">
                {j.readMore} <span className="inline-block transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link to="/journal" className="btn-outline !py-3 no-underline">{j.moreLabel}</Link>
        </div>
      </div>
    </section>
  );
}
