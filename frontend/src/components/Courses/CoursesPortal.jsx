import { useLanguage } from '../../context/LanguageContext.jsx';
import { useCourses } from '../../context/CoursesContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';
import CourseCard from './CourseCard.jsx';
import { COURSES_GRID_COLS } from './CoursesSection.jsx';

const TYPES = ['All', 'Video', 'Audio', 'PDF'];
const FREE_OPTS = ['All', 'Free', 'Paid'];

export default function CoursesPortal() {
  const { L, bodyFont } = useLanguage();
  const { courses } = useCourses();
  const { lmsOpen, lmsType, lmsFree, setLmsType, setLmsFree, closeLms } = useOverlay();

  if (!lmsOpen) return null;

  const filtered = courses.filter((c) =>
    (lmsType === 'All' || c.type === lmsType) &&
    (lmsFree === 'All' || (lmsFree === 'Free' ? c.free : !c.free))
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FDFBF6', zIndex: 150, overflow: 'auto' }}>
      <div className="section-pad" style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button onClick={closeLms} style={{ border: 'none', background: 'none', color: '#123F35', fontFamily: bodyFont, fontSize: 14, cursor: 'pointer', padding: 0 }}>&larr; {L.courses.back}</button>
          <a href="#top" onClick={closeLms} style={{ color: 'rgba(22,33,29,.5)', fontFamily: bodyFont, fontSize: 13 }}>{L.nav.about} &middot; {L.nav.services} &middot; {L.nav.faq}</a>
        </div>
        <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.1rem', color: '#16211D', margin: '0 0 24px' }}>{L.courses.lmsTitle}</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TYPES.map((t) => {
              const active = lmsType === t;
              return (
                <button key={t} onClick={() => setLmsType(t)} aria-pressed={active} className="filter-chip" style={{ borderRadius: 999, padding: '8px 16px', fontFamily: bodyFont, fontWeight: active ? 700 : 400, fontSize: 13, cursor: 'pointer', border: '1px solid #123F35', background: active ? '#123F35' : 'none', color: active ? '#FDFBF6' : '#123F35' }}>{t}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FREE_OPTS.map((f) => {
              const active = lmsFree === f;
              return (
                <button key={f} onClick={() => setLmsFree(f)} aria-pressed={active} className="filter-chip" style={{ borderRadius: 999, padding: '8px 16px', fontFamily: bodyFont, fontWeight: active ? 700 : 400, fontSize: 13, cursor: 'pointer', border: '1px solid #DD8452', background: active ? '#DD8452' : 'none', color: active ? '#16211D' : '#DD8452' }}>{f}</button>
              );
            })}
          </div>
        </div>
        <div className="courses-row" style={{ display: 'grid', gridTemplateColumns: COURSES_GRID_COLS, gap: 20 }}>
          {filtered.map((c) => <CourseCard key={c.id} course={c} variant="lms" />)}
        </div>
      </div>
    </div>
  );
}
