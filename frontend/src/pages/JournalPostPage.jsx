import { Link, useParams } from 'react-router-dom';
import Layout, { BackLink } from '../components/Layout.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { assetUrl } from '../lib/content.js';
import { usePageMeta } from '../lib/pageMeta.js';
import { findBySlug, postPath } from '../lib/slug.js';

export default function JournalPostPage() {
  const { slug } = useParams();
  const { t, u, lang, content, pick } = useSite();
  const j = t.journal;
  const posts = content?.journal_posts || [];
  const post = findBySlug(posts, slug);
  usePageMeta({ title: post ? pick(post, 'title') : '', description: post ? String(pick(post, 'excerpt') || pick(post, 'body') || '').slice(0, 155) : '', lang });

  if (!content) return <Layout><p className="section-pad container-x text-ink/75">{u.loading}</p></Layout>;
  if (!post) {
    return (
      <Layout>
        <div className="section-pad container-x"><p className="mb-4 text-lg">{u.notFound}</p><Link to="/journal">{j.title}</Link></div>
      </Layout>
    );
  }
  const others = posts.filter((p) => p !== post);

  return (
    <Layout>
      <div className="mx-auto grid max-w-[1100px] gap-14 px-5 pb-24 pt-10 md:px-8 lg:grid-cols-[1fr_260px]">
        <article>
          <div className="mb-7"><BackLink to="/journal" label={j.title} /></div>
          <div className="mb-2.5 text-[12.5px] text-terracotta">{pick(post, 'category')} · {pick(post, 'read_time')}</div>
          <h1 className="mb-6 font-serif text-[2rem] font-normal leading-[1.2] text-ink md:text-[2.1rem]">{pick(post, 'title')}</h1>
          {post.image_url && <img src={assetUrl(post.image_url)} alt="" className="mb-7 w-full max-w-[640px] rounded-lg object-cover" />}
          <div className="max-w-[640px]">
            {pick(post, 'body').split(/\n\s*\n/).map((para, i) => (
              <p key={i} className="mb-5 text-[17px] leading-[1.85] text-ink/75">{para}</p>
            ))}
          </div>
        </article>
        <aside className="border-green/15 lg:border-s lg:ps-8">
          <div className="mb-4 text-[13px] tracking-[.04em] text-terracotta">{j.moreLabel}</div>
          {others.map((p) => (
            <Link key={p.id ?? p.title} to={postPath(p)} className="mb-[18px] block border-b border-green/10 pb-[18px] !text-ink no-underline hover:!text-terracotta">
              <div className="mb-1.5 text-xs text-ink/70">{pick(p, 'category')} · {pick(p, 'read_time')}</div>
              <div className="font-serif text-[16.5px] leading-[1.4]">{pick(p, 'title')}</div>
            </Link>
          ))}
        </aside>
      </div>
    </Layout>
  );
}
