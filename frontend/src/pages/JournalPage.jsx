import { Link, useSearchParams } from 'react-router-dom';
import { chipCls } from '../components/chip.js';
import Layout, { BackLink } from '../components/Layout.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { postPath } from '../lib/slug.js';

export default function JournalPage() {
  const { t, u, content, pick } = useSite();
  const j = t.journal;
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') || '';
  const posts = content?.journal_posts || [];
  // topics are keyed by the English category so the filter survives a language switch
  const topics = [...new Map(posts.map((p) => [p.category, pick(p, 'category')])).entries()].filter(([k]) => k);
  const list = posts.filter((p) => !topic || p.category === topic);

  const chip = chipCls;

  return (
    <Layout>
      <div className="section-pad container-x !pt-10">
        <div className="mb-6 flex items-center gap-4">
          <BackLink to="/#journal" label={u.home} />
          <span className="text-[13.5px] text-ink/75">{j.kicker}</span>
        </div>
        <h1 className="mb-6 font-serif text-[2rem] font-normal text-ink md:text-[2.4rem]">{j.title}</h1>
        <div className="mb-8 flex flex-wrap gap-2">
          <button type="button" aria-pressed={!topic} className={chip(!topic)} onClick={() => setParams({}, { replace: true })}>{u.allTopics}</button>
          {topics.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={topic === key} className={chip(topic === key)}
              onClick={() => setParams({ topic: key }, { replace: true })}>{label}</button>
          ))}
        </div>
        {!content && <p className="text-ink/75">{u.loading}</p>}
        <div className="grid overflow-hidden rounded-lg border border-green/15 bg-cream md:grid-cols-2">
          {list.map((p) => (
            <Link key={p.id ?? p.title} to={postPath(p)}
              className="group flex flex-col gap-2 border-b border-green/10 p-6 !text-ink no-underline transition hover:bg-green/[.05] md:p-7 md:[&:nth-child(odd)]:border-e">
              <span className="text-[12.5px] text-terracotta">{pick(p, 'category')} · {pick(p, 'read_time')}</span>
              <span className="font-serif text-[22px] leading-snug">{pick(p, 'title')}</span>
              <span className="text-[14.5px] leading-relaxed text-ink/70">{pick(p, 'excerpt')}</span>
              <span className="mt-1 text-[14px] font-semibold text-green">
                {j.readMore} <span className="inline-block transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
