import { useEffect, useState } from 'react';
import { assetUrl } from '../../lib/content.js';
import { COURSE_KEY, certificateHtml, courseProgress, lessonsOf, touchCourse } from '../../lib/learning.js';
import { signedFileUrl } from '../../lib/orders.js';

const BUNNY_LIBRARY = import.meta.env.VITE_BUNNY_LIBRARY_ID;
const fill = (s, v) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, x ?? ''), s);
const GLYPH = { v: '▶', a: '♪', p: 'PDF' };

/** One course: your content (watch / listen / download), a lesson checklist with progress, and a certificate when finished. */
export default function CourseView({ course: c, p, a, lang, kindLabel, pick, name, idx, onBack, onToggle }) {
  const L = p.learn;
  const pr = courseProgress(c, idx);
  const lessons = lessonsOf(c);
  const marks = idx.done.get(c.id) || new Map();
  const [fileUrl, setFileUrl] = useState(null);
  const [watching, setWatching] = useState(false);
  const [err, setErr] = useState('');
  const embed = c.video_id && BUNNY_LIBRARY ? `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY}/${c.video_id}` : null;

  useEffect(() => { touchCourse(c.id); }, [c.id]);
  useEffect(() => { let alive = true; if (c.file_path) signedFileUrl(c.file_path).then((u) => alive && setFileUrl(u)); return () => { alive = false; }; }, [c.file_path]);

  async function toggle(key) {
    setErr('');
    const ok = await onToggle(c.id, key, !marks.has(key));
    if (!ok) setErr(L.saveError);
  }

  function certificate() {
    const html = certificateHtml({
      name: name || '', course: pick(c, 'title'), dateIso: pr.completedAt, lang,
      labels: { title: L.cert.title, certify: L.cert.certify, completed: L.cert.completed, on: L.cert.on, signed: L.cert.signed },
    });
    const w = window.open('', '_blank');
    if (!w) { setErr(L.popup); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onBack} className="self-start text-[14px] text-green underline underline-offset-4">← {L.back}</button>

      <header className="flex gap-4">
        {c.image_url && <img src={assetUrl(c.image_url)} alt="" className="hidden h-24 w-24 shrink-0 rounded-xl object-cover sm:block" />}
        <div className="min-w-0 flex-1">
          <div className="text-[12px] uppercase tracking-[.05em] text-terracotta">{kindLabel(c.type)}{c.meta ? ` · ${pick(c, 'meta')}` : ''}</div>
          <h2 className="m-0 mt-0.5 font-serif text-[1.6rem] font-normal leading-tight text-ink">{pick(c, 'title')}</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-green/15" role="progressbar" aria-valuenow={pr.pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-green transition-all" style={{ width: `${pr.pct}%` }} />
            </div>
            <span className="text-[13px] font-semibold text-green">{pr.pct}%</span>
          </div>
          <div className="mt-1 text-[12.5px] text-ink/75">{pr.single ? L.status[pr.status] : pr.total === 1 ? fill(L.lessonOne, { done: pr.done }) : fill(L.lessonsDone, { done: pr.done, total: pr.total })}</div>
        </div>
      </header>

      {pr.status === 'completed' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-green px-5 py-4 text-cream">
          <span className="font-serif text-[1.15rem]">🎉 {L.congrats}</span>
          <button type="button" onClick={certificate} className="rounded-full bg-cream px-4 py-2 text-[14px] font-semibold text-green hover:bg-white">{L.certificate}</button>
        </div>
      )}
      {err && <p role="alert" className="m-0 text-[13.5px] text-danger">{err}</p>}

      {(fileUrl || embed) && (
        <section className="rounded-2xl border border-green/15 bg-white p-4">
          <h3 className="mb-3 mt-0 text-[13px] font-semibold uppercase tracking-[.06em] text-ink/75">{L.yourContent}</h3>
          <div className="flex flex-wrap gap-2.5">
            {fileUrl && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-solid !py-2.5 !text-cream no-underline">{c.type === 'Audio' ? a.listen : a.download}</a>}
            {embed && <button type="button" className="btn-solid !py-2.5" onClick={() => setWatching(!watching)}>{a.watch}</button>}
          </div>
          {watching && embed && <div className="mt-4 aspect-video overflow-hidden rounded-lg bg-ink"><iframe title={pick(c, 'title')} src={embed} className="h-full w-full" allowFullScreen loading="lazy" /></div>}
        </section>
      )}
      {!fileUrl && !embed && <p className="m-0 rounded-xl bg-sand p-4 text-[14px] text-ink/70">{c.type === 'Video' ? a.videoSoon : a.fileSoon}</p>}

      <section>
        <h3 className="mb-3 mt-0 text-[13px] font-semibold uppercase tracking-[.06em] text-ink/75">{L.lessons}</h3>
        {lessons.length === 0 ? (
          <button type="button" onClick={() => toggle(COURSE_KEY)} className={pr.status === 'completed' ? 'btn-outline' : 'btn-solid'}>
            {pr.status === 'completed' ? `✓ ${L.courseDone} · ${L.markUndo}` : L.markCourse}
          </button>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {lessons.map((l, i) => {
              const on = marks.has(l.key);
              return (
                <li key={l.key} className={`flex items-center gap-3.5 rounded-xl border p-3.5 transition ${on ? 'border-green/25 bg-green/5' : 'border-green/15 bg-white'}`}>
                  <button type="button" onClick={() => toggle(l.key)} aria-pressed={on} aria-label={`${on ? L.done : L.markDone}: ${(lang === 'ar' && l.title_ar) || l.title}`}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[15px] transition ${on ? 'border-green bg-green text-cream' : 'border-green/35 text-transparent hover:border-green'}`}>✓</button>
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold ${on ? 'text-ink/75' : 'text-ink'}`}>{i + 1}. {(lang === 'ar' && l.title_ar) || l.title}</div>
                    {((lang === 'ar' && l.description_ar) || l.description) && <div className="text-[13px] text-ink/75">{(lang === 'ar' && l.description_ar) || l.description}</div>}
                  </div>
                  <span className="flex shrink-0 items-center gap-2 text-[12px] text-ink/75">
                    <span className="rounded bg-green/10 px-1.5 py-0.5 text-[12px] font-bold text-green" aria-hidden="true">{GLYPH[l.kind] || GLYPH.p}</span>
                    {(lang === 'ar' && l.length_ar) || l.length}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
