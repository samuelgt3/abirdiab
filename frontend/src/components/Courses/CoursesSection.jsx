import { useLanguage } from '../../context/LanguageContext.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useCourses } from '../../context/CoursesContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';
import { workshopSeatLabel } from '../../utils/copy.js';
import CourseCard from './CourseCard.jsx';

const COURSES_GRID_COLS = 'repeat(auto-fit,minmax(192px,1fr))';

export default function CoursesSection({ secNum }) {
  const { L, bodyFont, lang } = useLanguage();
  const { manageMode } = useAdmin();
  const { courses, addCourse } = useCourses();
  const { openBooking, openLms } = useOverlay();

  const previewCourses = courses.slice(0, 5);

  return (
    <section id="courses" className="section-pad" style={{ padding: '84px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 44, paddingBottom: 14, borderBottom: '1px solid rgba(18,63,53,.14)', justifyContent: 'flex-start' }}>
          <span style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(18,63,53,.3)' }}>{secNum}</span>
          <span style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.courses.kicker}</span>
        </div>

        <div id="workshop" className="services-row" style={{ border: '1px solid rgba(18,63,53,.14)', borderRadius: 6, padding: 34, display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 26, alignItems: 'center', marginBottom: 64, background: 'linear-gradient(135deg,#FDFBF6,#F8DCC7 180%)' }}>
          <div style={{ position: 'relative', height: 100, borderRadius: '50% 50% 8px 8px / 38% 38% 4px 4px', overflow: 'hidden', boxShadow: '0 10px 24px rgba(18,63,53,.14)' }}>
            <img src="/images/pendulum-set.jpg" alt="Pendulum healing tools laid out for a live group circle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: '#DD8452', marginBottom: 8 }}>{L.courses.workshopLive}</div>
            <div style={{ fontFamily: 'Newsreader,serif', fontSize: 22, color: '#16211D', marginBottom: 8 }}>{L.courses.workshopTitle}</div>
            <div style={{ fontFamily: bodyFont, fontSize: 14, color: 'rgba(22,33,29,.74)', marginBottom: 14, maxWidth: 480 }}>{L.courses.workshopDesc}</div>
            <div style={{ height: 6, background: 'rgba(18,63,53,.12)', borderRadius: 999, maxWidth: 280, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: '78%', height: '100%', background: '#DD8452' }} />
            </div>
            <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.72)' }}>{L.courses.seatsLeft}</div>
          </div>
          <button onClick={() => openBooking(workshopSeatLabel(lang))} style={{ background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: '15px 28px', fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>{L.courses.reserve}</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.3rem', color: '#16211D', margin: 0 }}>{L.courses.title}</h2>
          {manageMode && (
            <button onClick={addCourse} style={{ border: '1px solid #123F35', color: '#123F35', background: 'none', borderRadius: 2, padding: '8px 14px', fontFamily: bodyFont, fontSize: 13, cursor: 'pointer' }}>+ {L.courses.addItem}</button>
          )}
        </div>
        <div className="courses-row" style={{ display: 'grid', gridTemplateColumns: COURSES_GRID_COLS, gap: 20 }}>
          {previewCourses.map((c) => <CourseCard key={c.id} course={c} variant="preview" />)}
        </div>
        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <button onClick={openLms} className="view-all-btn" style={{ border: '1px solid #123F35', color: '#123F35', background: 'none', borderRadius: 2, padding: '14px 30px', fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>{L.courses.viewAll}</button>
        </div>
      </div>
    </section>
  );
}

export { COURSES_GRID_COLS };
