import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useOverlay } from '../context/OverlayContext.jsx';
import { oneOnOneLabel } from '../utils/copy.js';

export default function Header() {
  const { L, bodyFont, toggleLang, lang } = useLanguage();
  const { user } = useAuth();
  const { cartCount } = useCart();
  const {
    menuOpen, toggleMenu, closeMenu,
    coursesDropOpen, toggleCoursesDrop,
    openLmsClick, goCourses,
    openCart, openBooking, accountActions, openAuth,
  } = useOverlay();

  const headerBg = 'rgba(253,251,246,.85)';
  const headerBorder = '1px solid rgba(18,63,53,.14)';
  const headerTextColor = '#16211D';
  const headerBtnBorder = '1px solid rgba(18,63,53,.14)';
  const headerLogoRing = '#123F35';
  const oneOnOne = oneOnOneLabel(lang);
  const headerAuthLabel = user ? (user.name || '').split(' ')[0] : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In');
  const headerAuthClick = () => (user ? accountActions.open() : openAuth('account'));

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 60, background: '#FDFBF6' }}>
      <div style={{ background: '#123F35', color: '#FDFBF6', padding: '9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: bodyFont, fontSize: 13, textAlign: 'center' }}>
        <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#C1922F', flexShrink: 0 }} />
        <a href="#workshop" style={{ color: '#FDFBF6', textDecoration: 'none' }}>{L.urgency}</a>
      </div>

      <header style={{ background: headerBg, backdropFilter: 'blur(10px)', borderBottom: headerBorder, boxShadow: '0 4px 20px rgba(18,63,53,.05)' }}>
        <div className="section-pad" style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: headerTextColor }}>
            <span style={{ position: 'relative', width: 30, height: 30, flexShrink: 0 }}>
              <span style={{ position: 'absolute', inset: 0, border: `1.5px solid ${headerLogoRing}`, borderRadius: '50% 50% 4px 4px / 42% 42% 3px 3px' }} />
              <span style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: '#DD8452', insetInlineEnd: -2, bottom: -2 }} />
            </span>
            <span style={{ fontFamily: 'Newsreader,serif', fontSize: 19, letterSpacing: '.02em' }}>Abir Diab</span>
          </a>

          <nav className="nav-links" style={{ display: 'flex', gap: 28, fontFamily: bodyFont, fontSize: 14.5, color: headerTextColor }}>
            <a href="#about" style={{ color: 'inherit' }}>{L.nav.about}</a>
            <a href="#services" style={{ color: 'inherit' }}>{L.nav.services}</a>
            <div style={{ position: 'relative' }} className="courses-nav-item">
              <a href="#courses" onClick={toggleCoursesDrop} aria-expanded={coursesDropOpen} style={{ color: 'inherit' }}>{L.nav.library}</a>
              <div className="courses-dropdown" style={{ position: 'absolute', top: '100%', insetInlineStart: 0, paddingTop: 14, display: coursesDropOpen ? 'block' : 'none', minWidth: 180, zIndex: 60 }}>
                <div style={{ background: '#FDFBF6', border: '1px solid rgba(18,63,53,.14)', borderRadius: 4, boxShadow: '0 12px 24px rgba(18,63,53,.14)', padding: 6, display: 'flex', flexDirection: 'column' }}>
                  <a href="#courses" onClick={goCourses('Video')} className="nav-dropdown-link" style={{ padding: '10px 14px', color: '#16211D', fontSize: 14, borderRadius: 3 }}>{L.nav.videoCourses}</a>
                  <a href="#courses" onClick={goCourses('Audio')} className="nav-dropdown-link" style={{ padding: '10px 14px', color: '#16211D', fontSize: 14, borderRadius: 3 }}>{L.nav.audioMeditations}</a>
                  <a href="#courses" onClick={goCourses('PDF')} className="nav-dropdown-link" style={{ padding: '10px 14px', color: '#16211D', fontSize: 14, borderRadius: 3 }}>{L.nav.guides}</a>
                  <a href="#courses" onClick={goCourses('All')} className="nav-dropdown-link" style={{ padding: '10px 14px', color: '#DD8452', fontSize: 14, borderRadius: 3, fontWeight: 600 }}>{L.nav.allCourses}</a>
                </div>
              </div>
            </div>
            <a href="#journal" style={{ color: 'inherit' }}>{L.nav.journal}</a>
            <a href="#testimonials" style={{ color: 'inherit' }}>{L.nav.testimonials}</a>
            <a href="#faq" style={{ color: 'inherit' }}>{L.nav.faq}</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={toggleLang} style={{ border: headerBtnBorder, background: 'none', borderRadius: 2, padding: '8px 12px', fontFamily: bodyFont, fontSize: 13, cursor: 'pointer', color: headerTextColor }}>{L.langToggle}</button>
            <button onClick={headerAuthClick} className="header-auth-label" style={{ border: 'none', background: 'none', fontFamily: bodyFont, fontSize: 13.5, cursor: 'pointer', color: headerTextColor, whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{headerAuthLabel}</button>
            <button onClick={openCart} aria-label="Cart" style={{ position: 'relative', flexShrink: 0, border: headerBtnBorder, background: 'none', borderRadius: 2, padding: '8px 11px', cursor: 'pointer', color: headerTextColor, fontSize: 15 }}>
              🛒
              {cartCount > 0 && (
                <span style={{ position: 'absolute', top: -6, insetInlineEnd: -6, background: '#DD8452', color: '#16211D', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont }}>{cartCount}</span>
              )}
            </button>
            <button onClick={() => openBooking(oneOnOne)} className="btn-solid header-book" style={{ background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: '10px 20px', fontFamily: bodyFont, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{oneOnOne}</button>
            <button onClick={toggleMenu} aria-label="Open menu" style={{ display: 'none', border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: headerTextColor }} className="mobile-toggle">☰</button>
          </div>
        </div>

        {menuOpen && (
          <div style={{ borderTop: headerBorder, display: 'flex', flexDirection: 'column', padding: '14px 32px', gap: 14, fontFamily: bodyFont, fontSize: 15, color: headerTextColor, background: headerBg }}>
            <a onClick={closeMenu} href="#about" style={{ color: 'inherit' }}>{L.nav.about}</a>
            <a onClick={closeMenu} href="#services" style={{ color: 'inherit' }}>{L.nav.services}</a>
            <a onClick={openLmsClick} href="#courses" style={{ color: 'inherit' }}>{L.nav.library}</a>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingInlineStart: 16 }}>
              <a onClick={goCourses('Video')} href="#courses" style={{ color: 'inherit', opacity: .75, fontSize: 13.5 }}>{L.nav.videoCourses}</a>
              <a onClick={goCourses('Audio')} href="#courses" style={{ color: 'inherit', opacity: .75, fontSize: 13.5 }}>{L.nav.audioMeditations}</a>
              <a onClick={goCourses('PDF')} href="#courses" style={{ color: 'inherit', opacity: .75, fontSize: 13.5 }}>{L.nav.guides}</a>
            </div>
            <a onClick={closeMenu} href="#journal" style={{ color: 'inherit' }}>{L.nav.journal}</a>
            <a onClick={closeMenu} href="#testimonials" style={{ color: 'inherit' }}>{L.nav.testimonials}</a>
            <a onClick={closeMenu} href="#faq" style={{ color: 'inherit' }}>{L.nav.faq}</a>
            <div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: headerBorder }}>
              <button onClick={headerAuthClick} style={{ flex: 1, border: headerBtnBorder, background: 'none', borderRadius: 2, padding: 12, fontFamily: bodyFont, fontSize: 14, cursor: 'pointer', color: 'inherit' }}>{headerAuthLabel}</button>
              <button onClick={() => openBooking(oneOnOne)} style={{ flex: 1, background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: 12, fontFamily: bodyFont, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{oneOnOne}</button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
