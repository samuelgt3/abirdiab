import { useLanguage } from '../context/LanguageContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useOverlay } from '../context/OverlayContext.jsx';
import { oneOnOneLabel } from '../utils/copy.js';

export default function FloatingActionButton() {
  const { L, lang, bodyFont } = useLanguage();
  const { cartCount } = useCart();
  const { lmsOpen, openBooking, openCart } = useOverlay();

  if (!lmsOpen) {
    return (
      <button onClick={() => openBooking(oneOnOneLabel(lang))} style={{ position: 'fixed', bottom: 24, insetInlineEnd: 24, background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 999, padding: '16px 26px', fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', boxShadow: '0 12px 28px rgba(18,63,53,.35)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>✦</span>{oneOnOneLabel(lang)}
      </button>
    );
  }

  return (
    <button onClick={openCart} aria-label="View cart" style={{ position: 'fixed', bottom: 24, insetInlineEnd: 24, background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 999, padding: '16px 24px', fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', boxShadow: '0 12px 28px rgba(18,63,53,.35)', zIndex: 150, display: 'flex', alignItems: 'center', gap: 8 }}>
      🛒 {L.checkout.cartTitle}
      {cartCount > 0 && (
        <span style={{ background: '#DD8452', color: '#16211D', fontSize: 11, fontWeight: 700, borderRadius: '50%', width: 19, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>
      )}
    </button>
  );
}
