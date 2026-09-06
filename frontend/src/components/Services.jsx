import { useLanguage } from '../context/LanguageContext.jsx';
import { useOverlay } from '../context/OverlayContext.jsx';

export default function Services({ secNum }) {
  const { L, bodyFont } = useLanguage();
  const { openLmsClick } = useOverlay();

  return (
    <section id="services" className="section-pad" style={{ padding: '80px 32px', background: '#F5EDE0' }}>
      <div style={{ maxWidth: 1520, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(18,63,53,.3)', marginBottom: 4 }}>{secNum}</div>
          <div style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.services.kicker}</div>
        </div>
        <div>
          <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.2rem', color: '#16211D', margin: '0 0 40px', textAlign: 'center' }}>{L.services.title}</h2>
          {L.services.items.map((sv, i) => (
            <div key={i} className="services-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '26px 0', borderTop: '1px solid rgba(18,63,53,.14)' }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'Newsreader,serif', fontSize: 14, color: '#DD8452' }}>{sv.num}</span>
                <div>
                  <div style={{ fontFamily: 'Newsreader,serif', fontSize: 20, color: '#16211D', marginBottom: 6 }}>{sv.title}</div>
                  <div style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(22,33,29,.74)' }}>{sv.desc}</div>
                </div>
              </div>
              <a href={sv.href} onClick={sv.openList ? openLmsClick : undefined} style={{ flexShrink: 0, border: '1px solid #123F35', color: '#123F35', borderRadius: 2, padding: '10px 18px', fontFamily: bodyFont, fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap' }}>{L.services.learnMore}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
