import { useLanguage } from '../../context/LanguageContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useCourses } from '../../context/CoursesContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { localizeCourse } from '../../data/courses.js';
import { coursePriceLabel, courseKind } from '../../utils/courseView.js';

/** Shared card used both in the homepage preview row and the full Courses
 * portal grid. `variant` controls the size/detail differences between the
 * two contexts, matching the original design 1:1. */
export default function CourseCard({ course, variant = 'preview' }) {
  const { L, lang, bodyFont } = useLanguage();
  const { cart, toggleCart } = useCart();
  const { manageMode } = useAdmin();
  const { toggleLock, removeCourse } = useCourses();
  const { openCourse, openCart } = useOverlay();
  const { showToast } = useToast();

  const c = localizeCourse(course, lang);
  const { isPdf, isAudio, isPhoto } = courseKind(course.type);
  const inCart = cart.includes(course.id);
  const priceLabel = coursePriceLabel(course, L);
  const lockLabel = course.locked ? L.courses.unlockAll : L.courses.lockAgain;
  const cartLabel = inCart ? L.courses.inCart : L.courses.addToCart;
  const imgHeight = variant === 'preview' ? 160 : 140;

  const handleOpen = () => openCourse(course.id);
  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (inCart) { openCart(); return; }
    toggleCart(course.id);
    showToast(lang === 'ar' ? 'أُضيف إلى السلة' : 'Added to cart');
  };
  const handleToggleLock = (e) => { e.stopPropagation(); toggleLock(course.id); };
  const handleRemove = (e) => { e.stopPropagation(); removeCourse(course.id); };

  return (
    <div className="lib-card" style={{ cursor: 'pointer' }} onClick={handleOpen}>
      <div className="card-img" style={{ position: 'relative', height: imgHeight, background: '#DCE7E1', overflow: 'hidden' }}>
        {isPhoto && (
          <img src={`/${c.image}`} alt={c.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {isPdf && (
          <div style={{ position: 'absolute', inset: variant === 'preview' ? 10 : 8, clipPath: 'polygon(0 0,78% 0,100% 16%,100% 100%,0 100%)' }}>
            <img src={`/${c.image}`} alt={c.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 0, insetInlineEnd: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: variant === 'preview' ? '0 22px 22px 0' : '0 18px 18px 0', borderColor: 'transparent #DCE7E1 transparent transparent' }} />
            <div style={{ position: 'absolute', bottom: variant === 'preview' ? 10 : 8, insetInlineStart: 0, background: '#C06B3C', color: '#FDFBF6', fontFamily: bodyFont, fontWeight: 700, fontSize: variant === 'preview' ? 10 : 9, padding: variant === 'preview' ? '3px 8px' : '2px 6px', borderRadius: 2, letterSpacing: '.04em' }}>PDF</div>
          </div>
        )}
        {isAudio && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '56%', flex: 1, marginTop: variant === 'preview' ? 14 : 12, borderRadius: '50% 50% 40% 40% / 55% 55% 30% 30%', overflow: 'hidden' }}>
              <img src={`/${c.image}`} alt={c.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ width: '70%', height: variant === 'preview' ? 20 : 17, border: variant === 'preview' ? '4px solid #123F35' : '3.5px solid #123F35', borderTop: 'none', borderRadius: variant === 'preview' ? '0 0 40px 40px' : '0 0 34px 34px', marginTop: 2, flexShrink: 0 }} />
            <div style={{ width: 3, height: variant === 'preview' ? 12 : 10, background: '#123F35' }} />
            <div style={{ width: '44%', height: variant === 'preview' ? 3 : 2.5, background: '#123F35', marginTop: 2 }} />
          </div>
        )}
        {course.locked && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,33,29,.35)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span role="img" aria-label="Locked — purchase required" style={{ fontSize: variant === 'preview' ? 22 : 20 }}>🔒</span>
          </div>
        )}
        {variant === 'preview' ? (
          <>
            <span style={{ position: 'absolute', top: 10, insetInlineStart: 10, background: '#FDFBF6', color: '#123F35', fontFamily: bodyFont, fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>{c.badge}</span>
            <span style={{ position: 'absolute', top: 10, insetInlineEnd: 10, background: '#123F35', color: '#FDFBF6', fontFamily: bodyFont, fontSize: 10.5, padding: '4px 9px', borderRadius: 999 }}>{c.type}</span>
          </>
        ) : (
          <>
            <span style={{ position: 'absolute', top: 10, insetInlineStart: 10, background: '#FDFBF6', color: '#123F35', fontFamily: bodyFont, fontSize: 10.5, padding: '4px 9px', borderRadius: 999 }}>{c.type}</span>
            <span style={{ position: 'absolute', top: 10, insetInlineEnd: 10, background: '#123F35', color: '#FDFBF6', fontFamily: bodyFont, fontSize: 10.5, padding: '4px 9px', borderRadius: 999 }}>{c.meta}</span>
          </>
        )}
      </div>

      {variant === 'preview' ? (
        <div style={{ padding: '16px 2px 20px', borderBottom: '1px solid rgba(18,63,53,.14)' }}>
          <div style={{ fontFamily: bodyFont, fontSize: 11, color: '#DD8452', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>{c.category}</div>
          <div style={{ fontFamily: 'Newsreader,serif', fontSize: 17, color: '#16211D', marginBottom: 6 }}>{c.title}</div>
          <div style={{ fontFamily: bodyFont, fontSize: 13, color: 'rgba(22,33,29,.7)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.desc}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'Newsreader,serif', fontSize: 17, color: '#123F35' }}>{priceLabel}</span>
          </div>
          <button onClick={handleAddToCart} className="cart-btn" style={{ width: '100%', background: inCart ? '#123F35' : 'none', color: inCart ? '#FDFBF6' : '#123F35', border: '1px solid #123F35', borderRadius: 2, padding: 9, fontFamily: bodyFont, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>{cartLabel}</button>
          {manageMode && (
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(18,63,53,.1)', display: 'flex', gap: 8 }}>
              <button onClick={handleToggleLock} className="admin-lock-btn" style={{ flex: 1, fontSize: 11.5, fontFamily: bodyFont, border: '1px solid rgba(18,63,53,.2)', background: 'none', borderRadius: 2, padding: 6, cursor: 'pointer' }}>{lockLabel}</button>
              <button onClick={handleRemove} className="admin-remove-btn" style={{ fontSize: 11.5, fontFamily: bodyFont, border: '1px solid #C06B3C', color: '#C06B3C', background: 'none', borderRadius: 2, padding: '6px 10px', cursor: 'pointer' }}>{L.courses.remove}</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '14px 2px 18px', borderBottom: '1px solid rgba(18,63,53,.14)' }}>
          <div style={{ fontFamily: bodyFont, fontSize: 10.5, color: '#DD8452', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 5 }}>{c.category}</div>
          <div style={{ fontFamily: 'Newsreader,serif', fontSize: 15.5, color: '#16211D', marginBottom: 8 }}>{c.title}</div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: bodyFont, fontSize: 13, color: '#123F35', fontWeight: 600 }}>{priceLabel}</span>
          </div>
          <button onClick={handleAddToCart} className="cart-btn" style={{ width: '100%', background: inCart ? '#123F35' : 'none', color: inCart ? '#FDFBF6' : '#123F35', border: '1px solid #123F35', borderRadius: 2, padding: 8, fontFamily: bodyFont, fontWeight: 600, fontSize: 11.5, cursor: 'pointer' }}>{cartLabel}</button>
        </div>
      )}
    </div>
  );
}
