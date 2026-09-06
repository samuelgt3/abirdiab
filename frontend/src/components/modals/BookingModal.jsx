import { useLanguage } from '../../context/LanguageContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
const ZOOM_LINK = 'https://zoom.us/j/8827301944';

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function BookingModal() {
  const { L, lang, bodyFont } = useLanguage();
  const { booking, bookingActions, stopClick } = useOverlay();

  if (!booking.open) return null;

  const bothSelected = !!(booking.date && booking.time);
  const step1Disabled = !bothSelected;
  const step2Disabled = !(booking.name && booking.phone);

  const waText = encodeURIComponent(
    lang === 'ar'
      ? `تم تأكيد حجزك (${booking.context}) في ${booking.date} الساعة ${booking.time}. رابط زووم: ${ZOOM_LINK}`
      : `Your booking (${booking.context}) is confirmed for ${booking.date} at ${booking.time}. Zoom link: ${ZOOM_LINK}`
  );
  const mailSubject = encodeURIComponent(lang === 'ar' ? 'تأكيد الحجز' : 'Booking confirmation');
  const waHref = `https://wa.me/201080736170?text=${waText}`;
  const mailHref = `mailto:hello@abirdiab.com?subject=${mailSubject}&body=${waText}`;
  const confirmedLine = lang === 'ar'
    ? `تم تأكيد ${booking.context} ليوم ${booking.date} الساعة ${booking.time}. سنتواصل معك قبل الموعد.`
    : `Your ${booking.context} is set for ${booking.date} at ${booking.time}. We'll reach out before the session.`;

  return (
    <div onClick={bookingActions.close} style={{ position: 'fixed', inset: 0, background: 'rgba(18,63,53,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="modal-box" onClick={stopClick} style={{ background: '#FDFBF6', borderRadius: 8, maxWidth: 480, width: '100%', maxHeight: '88vh', overflow: 'auto', padding: 36, position: 'relative' }}>
        <button onClick={bookingActions.close} style={{ position: 'absolute', top: 16, insetInlineEnd: 16, border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#16211D' }}>&times;</button>
        <div style={{ fontFamily: bodyFont, fontSize: 12, color: '#DD8452', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 }}>{booking.context}</div>

        {booking.step === 1 && (
          <>
            <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.5rem', color: '#16211D', margin: '0 0 20px' }}>{L.booking.pickTime}</h3>
            <label htmlFor="booking-date-input" style={{ display: 'block', fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.72)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.03em' }}>{L.booking.dateLabel}</label>
            <input id="booking-date-input" type="date" value={booking.date || ''} min={tomorrowISO()} onChange={bookingActions.setDate} style={{ width: '100%', border: '1px solid rgba(18,63,53,.2)', borderRadius: 6, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14, color: '#16211D', marginBottom: 22, background: 'none' }} />
            <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.72)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.03em' }}>{L.booking.timeLabel}</div>
            <div style={{ fontFamily: bodyFont, fontSize: 12, color: 'rgba(22,33,29,.55)', marginBottom: 10 }}>{L.booking.timeNote}</div>
            <div className="booking-times" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              {TIME_SLOTS.map((t) => {
                const selected = booking.time === t;
                return (
                  <button key={t} onClick={() => bookingActions.selectTime(t)} style={{ border: `1px solid ${selected ? '#123F35' : 'rgba(18,63,53,.2)'}`, background: selected ? '#123F35' : 'none', color: selected ? '#FDFBF6' : '#16211D', borderRadius: 6, padding: '10px 4px', fontFamily: bodyFont, fontSize: 13, cursor: 'pointer' }}>{t}</button>
                );
              })}
            </div>
            {bothSelected && (
              <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: '#123F35', fontWeight: 600, marginBottom: 14 }}>&#10003; {booking.date} &middot; {booking.time}</div>
            )}
            <button onClick={bookingActions.toStep2} disabled={step1Disabled} style={{ width: '100%', background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: 14, fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', opacity: step1Disabled ? .5 : 1 }}>{L.booking.continue}</button>
          </>
        )}

        {booking.step === 2 && (
          <>
            <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.5rem', color: '#16211D', margin: '0 0 6px' }}>{L.booking.yourInfo}</h3>
            <div style={{ fontFamily: bodyFont, fontSize: 13, color: 'rgba(22,33,29,.72)', marginBottom: 22 }}>{booking.context} — {booking.date} &middot; {booking.time}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
              <input value={booking.name} onChange={bookingActions.setName} placeholder={L.booking.namePh} style={{ border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
              <input value={booking.phone} onChange={bookingActions.setPhone} placeholder={L.booking.phonePh} style={{ border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
              <input value={booking.email} onChange={bookingActions.setEmail} placeholder={L.booking.emailPh} type="email" style={{ border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={bookingActions.back} style={{ border: '1px solid #123F35', color: '#123F35', background: 'none', borderRadius: 2, padding: '14px 18px', fontFamily: bodyFont, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{L.booking.back}</button>
              <button onClick={bookingActions.confirm} disabled={step2Disabled} style={{ flex: 1, background: '#DD8452', color: '#16211D', border: 'none', borderRadius: 2, padding: 14, fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', opacity: step2Disabled ? .5 : 1 }}>{L.booking.confirmBtn}</button>
            </div>
          </>
        )}

        {booking.step === 3 && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#123F35', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: '#FDFBF6', fontSize: 22 }}>✓</div>
            <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.5rem', color: '#16211D', margin: '0 0 10px' }}>{L.booking.confirmedTitle}</h3>
            <p style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(22,33,29,.68)', lineHeight: 1.7, margin: '0 0 20px' }}>{confirmedLine}</p>
            <div style={{ border: '1px solid rgba(18,63,53,.14)', borderRadius: 6, padding: 16, marginBottom: 22, background: '#F5EDE0' }}>
              <div style={{ fontFamily: bodyFont, fontSize: 11.5, color: '#DD8452', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>{L.booking.zoomLabel}</div>
              <div style={{ fontFamily: bodyFont, fontSize: 14, color: '#123F35', wordBreak: 'break-all' }}>{ZOOM_LINK}</div>
            </div>
            <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.72)', marginBottom: 10 }}>{L.booking.sendVia}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={waHref} target="_blank" rel="noopener" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#123F35', color: '#FDFBF6', borderRadius: 2, padding: 13, fontFamily: bodyFont, fontWeight: 600, fontSize: 13.5 }}>{L.booking.viaWhatsapp}</a>
              <a href={mailHref} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid #123F35', color: '#123F35', borderRadius: 2, padding: 13, fontFamily: bodyFont, fontWeight: 600, fontSize: 13.5 }}>{L.booking.viaEmail}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
