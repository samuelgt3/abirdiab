import { useLanguage } from '../context/LanguageContext.jsx';
import { useAdmin } from '../context/AdminContext.jsx';
import { useOverlay } from '../context/OverlayContext.jsx';

const PAYMENT_METHODS = ['Visa', 'Mastercard', 'Fawry', 'Vodafone Cash'];

export default function Footer() {
  const { L, lang, bodyFont } = useLanguage();
  const { manageMode, toggleManage } = useAdmin();
  const { openLmsClick } = useOverlay();
  const manageLabel = manageMode
    ? (lang === 'ar' ? 'إنهاء وضع الإدارة' : 'Exit admin mode')
    : (lang === 'ar' ? 'إدارة الموقع' : 'Site admin');

  return (
    <footer className="section-pad" style={{ background: '#FDFBF6', borderTop: '1px solid rgba(18,63,53,.14)', padding: '52px 32px 24px' }}>
      <div className="footer-grid" style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr', gap: 40, marginBottom: 50 }}>
        <div>
          <div style={{ fontFamily: 'Newsreader,serif', fontSize: 19, color: '#16211D', marginBottom: 8 }}>Abir Diab</div>
          <div style={{ fontFamily: bodyFont, fontSize: 13.5, color: 'rgba(22,33,29,.72)', marginBottom: 16, maxWidth: 220 }}>{L.footer.tagline}</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <a href="https://instagram.com/abir_diaab" target="_blank" rel="noopener" style={{ color: '#123F35', fontFamily: bodyFont, fontSize: 13 }}>IG</a>
            <a href="https://youtube.com/@Abir_Diab" target="_blank" rel="noopener" style={{ color: '#123F35', fontFamily: bodyFont, fontSize: 13 }}>YT</a>
            <a href="https://tiktok.com/@.abir.diab" target="_blank" rel="noopener" style={{ color: '#123F35', fontFamily: bodyFont, fontSize: 13 }}>TT</a>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: '#DD8452', marginBottom: 12 }}>{L.footer.explore}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: bodyFont, fontSize: 13.5 }}>
            <a href="#about" style={{ color: '#16211D' }}>{L.nav.about}</a>
            <a href="#journal" style={{ color: '#16211D' }}>{L.nav.journal}</a>
            <a href="#faq" style={{ color: '#16211D' }}>{L.nav.faq}</a>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: '#DD8452', marginBottom: 12 }}>{L.footer.offerings}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: bodyFont, fontSize: 13.5 }}>
            <a href="#sessions" style={{ color: '#16211D' }}>{L.nav.services}</a>
            <a href="#courses" onClick={openLmsClick} style={{ color: '#16211D' }}>{L.nav.library}</a>
            <a href="#meditations" style={{ color: '#16211D' }}>Meditations</a>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: '#DD8452', marginBottom: 12 }}>{L.footer.payment}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {PAYMENT_METHODS.map((pm) => (
              <span key={pm} style={{ border: '1px solid rgba(18,63,53,.14)', borderRadius: 999, padding: '5px 12px', fontFamily: bodyFont, fontSize: 12, color: 'rgba(22,33,29,.72)' }}>{pm}</span>
            ))}
          </div>
          <a href="#contact" style={{ color: '#123F35', fontFamily: bodyFont, fontSize: 13.5 }}>{L.nav.contactLabel}</a>
        </div>
      </div>
      <div style={{ maxWidth: 1240, margin: '0 auto', borderTop: '1px solid rgba(18,63,53,.1)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.7)' }}>© 2026 Abir Diab. {L.footer.rights}</div>
        <button onClick={toggleManage} style={{ fontFamily: bodyFont, fontSize: 11.5, color: 'rgba(22,33,29,.35)', background: 'none', border: 'none', cursor: 'pointer' }}>{manageLabel}</button>
      </div>
    </footer>
  );
}
