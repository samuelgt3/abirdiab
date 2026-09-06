import { useLanguage } from '../context/LanguageContext.jsx';
import { useOverlay } from '../context/OverlayContext.jsx';
import { oneOnOneLabel } from '../utils/copy.js';

export default function Sessions({ secNum }) {
  const { L, bodyFont, lang } = useLanguage();
  const { openBooking } = useOverlay();

  return (
    <section id="sessions" className="section-pad" style={{ position: 'relative', overflow: 'hidden', background: '#0a1a15', padding: 0, minHeight: '92vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="sess-grid" style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: '.85fr 1.15fr', alignItems: 'stretch', minHeight: 640 }}>
        <div style={{ position: 'relative', minHeight: 340 }}>
          <img src="/images/pendulum-hand.jpg" alt="Abir guiding a pendulum during a 1:1 healing session" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(10,26,21,.15),rgba(10,26,21,.55) 92%,#0a1a15 100%)' }} />
        </div>
        <div style={{ padding: '64px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 32 }}>
            <span style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(253,251,246,.35)' }}>{secNum}</span>
            <span style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.sessions.kicker}</span>
          </div>
          <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.8rem', color: '#FDFBF6', margin: '0 0 24px' }}>{L.sessions.title}</h2>
          <p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.75, color: 'rgba(253,251,246,.78)', maxWidth: 520, margin: '0 0 26px', whiteSpace: 'pre-line' }}>{L.sessions.body1}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '0 0 30px', maxWidth: 520 }}>
            {L.sessions.checklist.map((ck, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: bodyFont, fontSize: 14.5, color: '#F5EDE0' }}>
                <span style={{ color: '#C1922F', marginTop: 1 }}>✓</span><span>{ck}</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.75, color: 'rgba(253,251,246,.78)', maxWidth: 520, margin: '0 0 34px' }}>{L.sessions.body2}</p>
          <button onClick={() => openBooking(oneOnOneLabel(lang))} className="btn-accent" style={{ width: 'fit-content', background: '#DD8452', color: '#16211D', border: 'none', borderRadius: 2, padding: '15px 30px', fontFamily: bodyFont, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>{L.sessions.cta}</button>
        </div>
      </div>
    </section>
  );
}
