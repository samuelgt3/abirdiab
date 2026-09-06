import { useLanguage } from '../../context/LanguageContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';

export default function JournalReader() {
  const { L, bodyFont } = useLanguage();
  const { activeJournalIndex, openJournal, closeJournal } = useOverlay();

  if (activeJournalIndex < 0) return null;
  const post = L.journal.posts[activeJournalIndex];
  if (!post) return null;
  const others = L.journal.posts.map((p, i) => ({ ...p, i })).filter((_, i) => i !== activeJournalIndex);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FDFBF6', zIndex: 150, overflow: 'auto' }}>
      <div className="journal-reader section-pad" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px 100px', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 56 }}>
        <div>
          <button onClick={closeJournal} style={{ border: 'none', background: 'none', color: '#123F35', fontFamily: bodyFont, fontSize: 14, cursor: 'pointer', marginBottom: 28, padding: 0 }}>&larr; {L.journal.title}</button>
          <div style={{ fontFamily: bodyFont, fontSize: 12, color: '#DD8452', marginBottom: 10 }}>{post.category} · {post.time}</div>
          <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.1rem', color: '#16211D', margin: '0 0 22px', lineHeight: 1.2 }}>{post.title}</h3>
          <p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.85, color: 'rgba(22,33,29,.75)', margin: 0, whiteSpace: 'pre-line', maxWidth: 640 }}>{post.full}</p>
        </div>
        <div style={{ borderInlineStart: '1px solid rgba(18,63,53,.14)', paddingInlineStart: 32 }}>
          <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: '#DD8452', letterSpacing: '.04em', marginBottom: 16 }}>{L.journal.moreLabel}</div>
          {others.map((op) => (
            <div key={op.i} onClick={() => openJournal(op.i)} style={{ cursor: 'pointer', paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid rgba(18,63,53,.1)' }}>
              <div style={{ fontFamily: bodyFont, fontSize: 11, color: 'rgba(22,33,29,.7)', marginBottom: 6 }}>{op.category} · {op.time}</div>
              <div style={{ fontFamily: 'Newsreader,serif', fontSize: 15.5, color: '#16211D', lineHeight: 1.4 }}>{op.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
