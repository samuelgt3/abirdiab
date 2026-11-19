import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '../../lib/content.js';
import { filterLibrary } from '../../lib/accountFilter.js';
import { countByStatus, courseProgress, pickContinue } from '../../lib/learning.js';
import Empty from './Empty.jsx';
import FilterBar from './FilterBar.jsx';

const fill = (s, v) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, x ?? ''), s);

function Bar({ pct }) {
  return <div className="h-1.5 overflow-hidden rounded-full bg-green/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} /></div>;
}

/** "x of y lessons" or a plain status for single-item courses */
function progressLine(pr, L) {
  if (pr.single) return L.status[pr.status];
  return pr.total === 1 ? fill(L.lessonOne, { done: pr.done }) : fill(L.lessonsDone, { done: pr.done, total: pr.total });
}

/** My learning: continue card, filters, and every course with its progress. */
export default function LearningTab({ p, lang, first, kindLabel, pick, data, onOpen }) {
  const L = p.learn;
  const { library, idx } = data;
  const [filter, setFilter] = useState('all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');

  const view = useMemo(() => (library || []).map((c) => ({ c, pr: courseProgress(c, idx) })), [library, idx]);
  const counts = useMemo(() => countByStatus(library, idx), [library, idx]);
  const cont = useMemo(() => pickContinue(library, idx), [library, idx]);
  const types = useMemo(() => [...new Set((library || []).map((c) => c.type).filter(Boolean))], [library]);
  const shown = filterLibrary(view.filter((x) => filter === 'all' || x.pr.status === filter), { type, q }, (c) => pick(c, 'title'));

  if (library === null) return <p className="text-ink/75">…</p>;
  if (library.length === 0) {
    return (
      <Empty title={p.empty.courses} lead={p.empty.coursesLead}>
        <Link to="/materials" className="btn-solid !text-cream no-underline">{p.empty.browse}</Link>
      </Empty>
    );
  }

  const cover = (c, cls) => (c.image_url
    ? <img src={assetUrl(c.image_url)} alt="" loading="lazy" className={`${cls} object-cover`} />
    : <div className={`${cls} bg-green/10`} aria-hidden="true" />);

  return (
    <div className="flex flex-col gap-7">
      <section className="rounded-2xl bg-gradient-to-br from-green to-[#1b5446] p-5 text-cream sm:p-6">
        <h2 className="m-0 font-serif text-[1.5rem] font-normal">{first ? fill(L.welcome, { name: first }) : L.welcomeNoName}</h2>
        <p className="mb-4 mt-1 text-[14.5px] text-cream/80">{L.welcomeSub}</p>
        <div className="grid grid-cols-3 gap-2.5 sm:max-w-md">
          {[['courses', counts.all], ['inProgress', counts.inProgress], ['completed', counts.completed]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-cream/10 px-3 py-2.5">
              <div className="font-serif text-[1.6rem] leading-none">{v}</div>
              <div className="mt-1 text-[12px] text-cream/75">{L.stats[k]}</div>
            </div>
          ))}
        </div>
      </section>

      {cont && (
        <section className="overflow-hidden rounded-2xl border border-green/20 bg-green text-cream">
          <div className="flex flex-col sm:flex-row">
            {cover(cont.c, 'h-40 w-full sm:h-auto sm:w-48 shrink-0')}
            <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
              <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-terracotta">{L.continue}</div>
              <h2 className="m-0 font-serif text-[1.35rem] font-normal leading-snug">{pick(cont.c, 'title')}</h2>
              {cont.pr.next && <p className="m-0 text-[14px] text-cream/80">{fill(L.next, { title: (lang === 'ar' && cont.pr.next.title_ar) || cont.pr.next.title })}</p>}
              <div className="mt-1 text-[12.5px] text-cream/75">{progressLine(cont.pr, L)} · {fill(L.percent, { pct: cont.pr.pct })}</div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cream/25"><div className="h-full rounded-full bg-gold" style={{ width: `${cont.pr.pct}%` }} /></div>
              <div className="mt-2"><button type="button" onClick={() => onOpen(cont.c.id)} className="rounded-full bg-cream px-5 py-2.5 text-[14.5px] font-semibold text-green transition hover:bg-white">{cont.pr.status === 'notStarted' ? L.start : L.resume}</button></div>
            </div>
          </div>
        </section>
      )}

      {view.length > 1 && (
        <FilterBar label={p.nav.learning} value={filter} onChange={setFilter} q={q} onQ={setQ} searchLabel={p.list.searchLearning}
          chips={['all', 'inProgress', 'notStarted', 'completed'].map((k) => ({ key: k, label: L.filters[k], count: counts[k] }))}
          select={types.length > 1 ? { label: p.list.typeLabel, value: type, onChange: setType, options: [{ key: 'all', label: p.list.allTypes }, ...types.map((t) => ({ key: t, label: kindLabel(t) }))] } : undefined} />
      )}

      {shown.length === 0 && <p className="m-0 text-ink/75">{L.noMatch}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map(({ c, pr }) => (
          <article key={c.id} className="flex flex-col overflow-hidden rounded-2xl border border-green/15 bg-white shadow-[0_2px_10px_rgba(18,63,53,.05)]">
            <button type="button" onClick={() => onOpen(c.id)} className="relative block text-start" aria-label={pick(c, 'title')}>
              {cover(c, 'aspect-[16/9] w-full')}
              <span className={`absolute end-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${pr.status === 'completed' ? 'bg-green text-cream' : 'bg-cream/95 text-green'}`}>{L.status[pr.status]}</span>
            </button>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="text-[12px] uppercase tracking-[.05em] text-terracotta">{kindLabel(c.type)}</div>
              <h3 className="m-0 font-serif text-[1.15rem] font-normal leading-snug text-ink">{pick(c, 'title')}</h3>
              <div className="mt-auto pt-1">
                <div className="mb-1.5 flex justify-between text-[12.5px] text-ink/75"><span>{progressLine(pr, L)}</span><span>{pr.pct}%</span></div>
                <Bar pct={pr.pct} />
              </div>
              <button type="button" onClick={() => onOpen(c.id)} className="btn-outline mt-2 w-full !py-2.5 !text-[14px]">
                {pr.status === 'completed' ? L.review : pr.status === 'notStarted' ? L.start : L.resume}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
