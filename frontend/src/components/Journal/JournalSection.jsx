import { useLanguage } from '../../context/LanguageContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';

export default function JournalSection({ secNum }) {
  const { L, bodyFont } = useLanguage();
  const { openJournal } = useOverlay();

  return (
    <section id="journal" className="section-pad" style={{ padding: '80px 32px', background: '#F5EDE0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 44, paddingBottom: 14, borderBottom: '1px solid rgba(18,63,53,.14)', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(18,63,53,.3)' }}>{secNum}</span>
          <span style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.journal.kicker}</span>
        </div>
        <div>
          <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.3rem', color: '#16211D', margin: '0 0 36px', textAlign: 'end' }}>{L.journal.title}</h2>
          <div className="testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', border: '1px solid rgba(18,63,53,.14)', borderRadius: 4 }}>
            {L.journal.posts.map((p, i) => (
              <div key={i} onClick={() => openJournal(i)} className="jr-row" style={{ cursor: 'pointer', padding: 30, borderInlineEnd: '1px solid rgba(18,63,53,.14)', borderBottom: '1px solid rgba(18,63,53,.14)' }}>
                <div style={{ fontFamily: bodyFont, fontSize: 12, color: '#DD8452', marginBottom: 10 }}>{p.category} · {p.time}</div>
                <div style={{ fontFamily: 'Newsreader,serif', fontSize: 19, color: '#16211D', marginBottom: 8 }}>{p.title}</div>
                <div style={{ fontFamily: bodyFont, fontSize: 14, color: 'rgba(22,33,29,.74)', lineHeight: 1.6, marginBottom: 12 }}>{p.excerpt}</div>
                <span style={{ fontFamily: bodyFont, fontSize: 13, color: '#123F35', fontWeight: 600 }}>{L.journal.readMore} <span className="jr-arrow">&rarr;</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
