import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function FAQ({ secNum }) {
  const { L, bodyFont } = useLanguage();
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" className="section-pad" style={{ padding: '76px 32px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(18,63,53,.3)', marginBottom: 4 }}>{secNum}</div>
          <div style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.faq.kicker}</div>
        </div>
        <div>
          <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.2rem', color: '#16211D', margin: '0 0 32px', textAlign: 'center' }}>{L.faq.title}</h2>
          {L.faq.items.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} style={{ borderBottom: '1px solid rgba(18,63,53,.14)' }}>
                <button onClick={() => setOpenIdx(isOpen ? -1 : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: '20px 0', cursor: 'pointer', textAlign: 'start', fontFamily: bodyFont, fontSize: 16, color: '#16211D', fontWeight: 600 }}>
                  <span>{f.q}</span>
                  <span style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform .2s', fontSize: 20, color: '#DD8452', flexShrink: 0, marginInlineStart: 16 }}>+</span>
                </button>
                {isOpen && (
                  <p className="faq-answer" style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(22,33,29,.74)', lineHeight: 1.7, margin: '0 0 20px' }}>{f.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
