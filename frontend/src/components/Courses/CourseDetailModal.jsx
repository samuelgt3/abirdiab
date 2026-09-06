import { useLanguage } from '../../context/LanguageContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCourses } from '../../context/CoursesContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';
import { localizeCourse } from '../../data/courses.js';
import { coursePriceLabel, courseDownloadLabel } from '../../utils/courseView.js';

export default function CourseDetailModal() {
  const { L, lang, bodyFont } = useLanguage();
  const { cart, toggleCart } = useCart();
  const { courses } = useCourses();
  const { activeCourseId, closeCourse, stopClick } = useOverlay();

  const course = courses.find((c) => c.id === activeCourseId);
  if (!course) return null;

  const c = localizeCourse(course, lang);
  const inCart = cart.includes(course.id);
  const priceLabel = coursePriceLabel(course, L);
  const downloadLabel = courseDownloadLabel(course, L);
  const cartLabel = inCart ? L.courses.inCart : L.courses.addToCart;

  return (
    <div onClick={closeCourse} style={{ position: 'fixed', inset: 0, background: 'rgba(18,63,53,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="modal-box" onClick={stopClick} style={{ background: '#FDFBF6', borderRadius: 6, maxWidth: 520, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 36, position: 'relative' }}>
        <button onClick={closeCourse} style={{ position: 'absolute', top: 16, insetInlineEnd: 16, border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#16211D' }}>&times;</button>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: bodyFont, fontSize: 11, color: '#DD8452', textTransform: 'uppercase', letterSpacing: '.03em' }}>{c.category}</span>
          <span style={{ fontFamily: bodyFont, fontSize: 11, color: 'rgba(22,33,29,.7)' }}>&middot; {c.meta}</span>
        </div>
        <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.7rem', color: '#16211D', margin: '0 0 14px' }}>{c.title}</h3>
        <p style={{ fontFamily: bodyFont, fontSize: 15, lineHeight: 1.75, color: 'rgba(22,33,29,.72)', margin: '0 0 18px' }}>{c.full}</p>
        <div style={{ fontFamily: bodyFont, fontSize: 13, color: '#16211D', fontWeight: 600, marginBottom: 8 }}>{L.courses.whatYouGet}</div>
        <ul style={{ margin: '0 0 20px', paddingInlineStart: 20 }}>
          {(c.whatYouGet || []).map((w, i) => (
            <li key={i} style={{ fontFamily: bodyFont, fontSize: 14, color: 'rgba(22,33,29,.68)', lineHeight: 1.7 }}>{w}</li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          <span style={{ border: '1px solid rgba(18,63,53,.14)', borderRadius: 999, padding: '5px 12px', fontFamily: bodyFont, fontSize: 12, color: 'rgba(22,33,29,.72)' }}>{downloadLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Newsreader,serif', fontSize: 20, color: '#123F35' }}>{priceLabel}</span>
          <button onClick={() => toggleCart(course.id)} style={{ background: inCart ? '#123F35' : 'none', color: inCart ? '#FDFBF6' : '#123F35', border: '1px solid #123F35', borderRadius: 2, padding: '12px 24px', fontFamily: bodyFont, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{cartLabel}</button>
        </div>
      </div>
    </div>
  );
}
