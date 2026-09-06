import { useLanguage } from '../context/LanguageContext.jsx';
import { useOverlay } from '../context/OverlayContext.jsx';
import { oneOnOneLabel } from '../utils/copy.js';

export default function Hero() {
  const { L, lang, bodyFont } = useLanguage();
  const { openBooking, openLmsClick } = useOverlay();
  const priceHint = lang === 'ar' ? 'الجلسات والدورات تبدأ من 7$' : 'Sessions & courses from $7';

  return (
    <section className="section-pad" style={{ position: 'relative', overflow: 'hidden', padding: '56px 32px 0', minHeight: '92vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="hero-grid" style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 60, alignItems: 'center' }}>
        <div>
          <span style={{ display: 'inline-block', border: '1px solid rgba(221,132,82,.4)', color: '#DD8452', borderRadius: 999, padding: '6px 16px', fontFamily: bodyFont, fontSize: 13, marginBottom: 22 }}>✦ {L.hero.eyebrow}</span>
          <h1 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '4.2rem', lineHeight: 1.08, color: '#16211D', margin: '0 0 22px' }}>
            {L.hero.pre} <em style={{ color: '#DD8452', fontStyle: 'italic' }}>{L.hero.accent}</em> {L.hero.post}
          </h1>
          <p style={{ fontFamily: bodyFont, fontSize: 18, lineHeight: 1.7, color: 'rgba(22,33,29,.7)', maxWidth: 520, margin: '0 0 32px' }}>{L.hero.lead}</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
            <button onClick={() => openBooking(oneOnOneLabel(lang))} className="btn-solid" style={{ background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: '15px 30px', fontFamily: bodyFont, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>{L.hero.cta1}</button>
            <a href="#courses" onClick={openLmsClick} style={{ border: '1px solid #123F35', color: '#123F35', borderRadius: 2, padding: '15px 30px', fontFamily: bodyFont, fontWeight: 600, fontSize: 15 }}>{L.hero.cta2}</a>
          </div>
          <div style={{ fontFamily: bodyFont, fontSize: 13, color: 'rgba(22,33,29,.72)' }}>{priceHint}</div>
        </div>
        <div style={{ position: 'relative', justifySelf: 'center' }}>
          <div className="ring-cw" style={{ position: 'absolute', inset: -26, border: '1px solid rgba(193,146,47,.5)', borderRadius: '50% 50% 8px 8px / 38% 38% 4px 4px', animation: 'ring-cw 40s linear infinite' }} />
          <div style={{ position: 'relative', width: 320, height: 400, borderRadius: '50% 50% 8px 8px / 38% 38% 4px 4px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(18,63,53,.18)' }}>
            <img src="/images/portrait.jpg" alt="Abir Diab smiling warmly, seated in a softly lit studio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ position: 'absolute', bottom: -18, insetInlineStart: -30, background: '#123F35', color: '#FDFBF6', borderRadius: 2, padding: '14px 20px', fontFamily: bodyFont, fontSize: 13, boxShadow: '0 14px 30px rgba(0,0,0,.2)', maxWidth: 200 }}>{L.hero.since}</div>
        </div>
      </div>

      <div className="stats-bar section-pad" style={{ maxWidth: 1000, margin: '44px auto 0', background: '#FDFBF6', borderRadius: 4, boxShadow: '0 20px 50px rgba(18,63,53,.12)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', position: 'relative', top: 30, zIndex: 2 }}>
        {L.stats.map((s, i) => (
          <div key={i} style={{ padding: '26px 20px', textAlign: 'center', borderInlineEnd: '1px solid rgba(18,63,53,.1)' }}>
            <div style={{ fontFamily: 'Newsreader,serif', fontSize: '2rem', color: '#123F35' }}>{s.n}</div>
            <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.72)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 40 }} />
    </section>
  );
}
