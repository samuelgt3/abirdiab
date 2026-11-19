import { useSearchParams } from 'react-router-dom';
import CourseCard from '../components/CourseCard.jsx';
import Layout, { BackLink } from '../components/Layout.jsx';
import { chipCls } from '../components/chip.js';
import { useSite } from '../hooks/SiteContext.jsx';

const TYPES = ['All', 'Video', 'Audio', 'PDF'];

/** Full catalogue: search + type chips + free chip. Filters live in the URL (?type=Audio&free=1&q=...). */
export default function MaterialsPage() {
  const { t, u, lang, content, pick } = useSite();
  const c = t.courses;
  const [params, setParams] = useSearchParams();
  const type = TYPES.includes(params.get('type')) ? params.get('type') : 'All';
  const free = params.get('free') === '1';
  const q = params.get('q') || '';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'All') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const typeLabel = { All: c.filterAll, Video: t.nav.videoCourses, Audio: t.nav.audioMeditations, PDF: t.nav.guides };
  const all = content?.courses || [];
  const needle = q.trim().toLocaleLowerCase(lang);
  const list = all.filter((x) =>
    (type === 'All' || x.type === type) &&
    (!free || x.is_free || !x.price_usd) &&
    (!needle || [pick(x, 'title'), pick(x, 'description'), pick(x, 'category'), x.title]
      .join(' ').toLocaleLowerCase(lang).includes(needle)));

  const chip = chipCls;

  return (
    <Layout>
      <div className="section-pad container-x !pt-10">
        <div className="mb-6 flex items-center gap-4">
          <BackLink to="/#courses" label={c.back} />
          <span className="text-[13.5px] text-ink/75">{c.kicker}</span>
        </div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <h1 className="m-0 font-serif text-[2rem] font-normal text-ink md:text-[2.1rem]">{c.lmsTitle}</h1>
          {content && <span className="text-[13.5px] text-ink/70">{u.countOf.replace('{n}', list.length).replace('{total}', all.length)}</span>}
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3">
          <input type="search" value={q} onChange={(e) => set('q', e.target.value)} placeholder={u.searchPh} aria-label={u.searchPh}
            className="max-w-[300px] flex-[1_1_220px] rounded-full border border-green/30 bg-white px-4 py-2 text-[14px]" />
          <div className="flex flex-wrap gap-2" role="group" aria-label={c.kicker}>
            {TYPES.map((k) => (
              <button key={k} type="button" aria-pressed={type === k} onClick={() => set('type', k)} className={chip(type === k)}>{typeLabel[k]}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={!free} onClick={() => set('free', '')} className={chip(!free, true)}>{c.filterAll}</button>
            <button type="button" aria-pressed={free} onClick={() => set('free', '1')} className={chip(free, true)}>{c.free}</button>
          </div>
        </div>

        {!content && <p className="py-8 text-ink/75">{u.loading}</p>}
        {content && list.length === 0 && <p className="py-8 text-[15.5px] text-ink/70">{u.noMatch}</p>}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {list.map((x) => <CourseCard key={x.id ?? x.title} course={x} variant="lms" />)}
        </div>
      </div>
    </Layout>
  );
}
