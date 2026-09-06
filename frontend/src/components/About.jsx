import { useLanguage } from '../context/LanguageContext.jsx';

export default function About({ secNum }) {
  const { L, bodyFont } = useLanguage();
  return (
    <section id="about" className="section-pad" style={{ padding: '76px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 44, paddingBottom: 14, borderBottom: '1px solid rgba(18,63,53,.14)', justifyContent: 'flex-start' }}>
          <span style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(18,63,53,.3)' }}>{secNum}</span>
          <span style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.about.kicker}</span>
        </div>
        <div>
          <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 48, alignItems: 'start' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 14, insetInlineEnd: -14, top: 14, background: '#EFD9D1', borderRadius: '50% 50% 8px 8px / 38% 38% 4px 4px', zIndex: 0 }} />
              <div style={{ position: 'relative', width: '100%', aspectRatio: '3/3.7', borderRadius: '50% 50% 8px 8px / 38% 38% 4px 4px', overflow: 'hidden', zIndex: 1, boxShadow: '0 20px 40px rgba(18,63,53,.14)' }}>
                <img src="/images/portrait-about.jpg" alt="Abir Diab standing beside a carved Arabic calligraphy panel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            <div>
              <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '3rem', color: '#16211D', margin: '0 0 26px' }}>{L.about.title}</h2>
              <p style={{ fontFamily: bodyFont, fontSize: 16.5, lineHeight: 1.75, color: 'rgba(22,33,29,.75)', margin: '0 0 24px' }}>{L.about.bio}</p>
              <p style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.6, color: '#123F35', borderInlineStart: '2px solid #C1922F', paddingInlineStart: 18, margin: '0 0 28px' }}>{L.about.quote}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 44 }}>
                {L.about.chips.map((c, i) => (
                  <span key={i} style={{ border: '1px solid rgba(18,63,53,.14)', color: '#123F35', borderRadius: 999, padding: '8px 16px', fontFamily: bodyFont, fontSize: 13.5 }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="timeline-row" style={{ display: 'flex', position: 'relative', marginTop: 20 }}>
            <div className="timeline-line" style={{ position: 'absolute', top: 8, insetInlineStart: 0, insetInlineEnd: 0, height: 1, background: 'rgba(18,63,53,.14)' }} />
            {L.about.timeline.map((tl, i) => (
              <div key={i} style={{ flex: 1, paddingInlineEnd: 16, position: 'relative' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#C1922F', marginBottom: 14 }} />
                <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: '#DD8452', fontWeight: 600, marginBottom: 6 }}>{tl.year}</div>
                <div style={{ fontFamily: 'Newsreader,serif', fontSize: 17, color: '#16211D', marginBottom: 6 }}>{tl.title}</div>
                <div style={{ fontFamily: bodyFont, fontSize: 13.5, color: 'rgba(22,33,29,.74)', lineHeight: 1.6 }}>{tl.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
