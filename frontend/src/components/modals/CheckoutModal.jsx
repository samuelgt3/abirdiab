import { useLanguage } from '../../context/LanguageContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCourses } from '../../context/CoursesContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';
import { localizeCourse } from '../../data/courses.js';
import { coursePriceLabel } from '../../utils/courseView.js';

export default function CheckoutModal() {
  const { L, lang, bodyFont } = useLanguage();
  const { cart, removeFromCart } = useCart();
  const { courses } = useCourses();
  const { checkout, checkoutActions, stopClick } = useOverlay();

  if (!checkout.open) return null;

  const items = cart
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({ ...localizeCourse(c, lang), rawId: c.id, priceLabel: coursePriceLabel(c, L) }));
  const totalPrice = items.reduce((sum, c) => sum + (c.free ? 0 : c.price), 0);
  const empty = items.length === 0;

  const waText = encodeURIComponent(
    lang === 'ar' ? `تم شراء ${items.length} دورة بنجاح. الوصول متاح في حسابك.` : `Purchase of ${items.length} course(s) complete. Access is in your account.`
  );
  const waHref = `https://wa.me/201080736170?text=${waText}`;
  const mailHref = `mailto:hello@abirdiab.com?subject=${encodeURIComponent(lang === 'ar' ? 'إيصال الشراء' : 'Purchase receipt')}&body=${waText}`;
  const payLabel = lang === 'ar' ? 'إتمام الدفع' : 'Complete Payment';
  const successLine = lang === 'ar'
    ? 'تم تأكيد الشراء. يمكنك الوصول لدوراتك من حسابك في أي وقت.'
    : 'Purchase confirmed — access your courses anytime from My Account.';

  return (
    <div onClick={checkoutActions.close} style={{ position: 'fixed', inset: 0, background: 'rgba(18,63,53,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="modal-box" onClick={stopClick} style={{ background: '#FDFBF6', borderRadius: 8, maxWidth: 460, width: '100%', maxHeight: '88vh', overflow: 'auto', padding: 36, position: 'relative' }}>
        <button onClick={checkoutActions.close} style={{ position: 'absolute', top: 16, insetInlineEnd: 16, border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#16211D' }}>&times;</button>

        {checkout.stage === 'review' && (
          <>
            <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.4rem', color: '#16211D', margin: '0 0 20px' }}>{L.checkout.cartTitle}</h3>
            {empty && <p style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(22,33,29,.72)' }}>{L.checkout.emptyCart}</p>}
            {items.map((ci) => (
              <div key={ci.rawId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(18,63,53,.14)' }}>
                <img src={`/${ci.image}`} alt={ci.title} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Newsreader,serif', fontSize: 14.5, color: '#16211D' }}>{ci.title}</div>
                  <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.72)' }}>{ci.priceLabel}</div>
                </div>
                <button onClick={() => removeFromCart(ci.rawId)} style={{ border: 'none', background: 'none', color: '#C06B3C', fontSize: 13, cursor: 'pointer', fontFamily: bodyFont }}>{L.courses.remove}</button>
              </div>
            ))}
            {!empty && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0', marginBottom: 20 }}>
                  <span style={{ fontFamily: bodyFont, fontSize: 14, color: 'rgba(22,33,29,.74)' }}>{L.checkout.total}</span>
                  <span style={{ fontFamily: 'Newsreader,serif', fontSize: 22, color: '#123F35' }}>${totalPrice}</span>
                </div>
                <button onClick={checkoutActions.proceed} style={{ width: '100%', background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: 14, fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer' }}>{L.checkout.proceedBtn}</button>
              </>
            )}
          </>
        )}

        {checkout.stage === 'payment' && (
          <>
            <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.4rem', color: '#16211D', margin: '0 0 18px' }}>{L.checkout.payTitle}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid rgba(18,63,53,.14)', borderBottom: '1px solid rgba(18,63,53,.14)', padding: '14px 0', marginBottom: 22 }}>
              <span style={{ fontFamily: bodyFont, fontSize: 14, color: 'rgba(22,33,29,.74)' }}>{L.checkout.total} ({items.length})</span>
              <span style={{ fontFamily: 'Newsreader,serif', fontSize: 22, color: '#123F35' }}>${totalPrice}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
              <input value={checkout.card} onChange={checkoutActions.setCard} placeholder={L.checkout.cardPh} style={{ border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <input value={checkout.expiry} onChange={checkoutActions.setExpiry} placeholder={L.checkout.expiryPh} style={{ flex: 1, border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
                <input value={checkout.cvv} onChange={checkoutActions.setCvv} placeholder={L.checkout.cvvPh} style={{ flex: 1, border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
              </div>
            </div>
            <button onClick={checkoutActions.pay} style={{ width: '100%', background: '#DD8452', color: '#16211D', border: 'none', borderRadius: 2, padding: 14, fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer' }}>{payLabel}</button>
            <div style={{ fontFamily: bodyFont, fontSize: 11, color: 'rgba(22,33,29,.45)', textAlign: 'center', marginTop: 12 }}>{L.checkout.sampleNote}</div>
          </>
        )}

        {checkout.stage === 'success' && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#123F35', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: '#FDFBF6', fontSize: 22 }}>✓</div>
            <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.4rem', color: '#16211D', margin: '0 0 10px' }}>{L.checkout.successTitle}</h3>
            <p style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(22,33,29,.68)', lineHeight: 1.7, margin: '0 0 22px' }}>{successLine}</p>
            <button onClick={checkoutActions.goToAccount} style={{ display: 'block', width: '100%', textAlign: 'center', background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: 14, fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', marginBottom: 20 }}>{L.checkout.viewInAccount}</button>
            <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.72)', marginBottom: 10 }}>{L.booking.sendVia}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={waHref} target="_blank" rel="noopener" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid #123F35', color: '#123F35', borderRadius: 2, padding: 12, fontFamily: bodyFont, fontWeight: 600, fontSize: 13 }}>{L.booking.viaWhatsapp}</a>
              <a href={mailHref} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid #123F35', color: '#123F35', borderRadius: 2, padding: 12, fontFamily: bodyFont, fontWeight: 600, fontSize: 13 }}>{L.booking.viaEmail}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
