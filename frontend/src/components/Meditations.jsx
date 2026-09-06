import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Meditations({ secNum }) {
  const { L, bodyFont, lang } = useLanguage();
  const { showToast } = useToast();
  const [playingSample, setPlayingSample] = useState(-1);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const play = (i) => {
    const wasPlaying = playingSample === i;
    setPlayingSample(wasPlaying ? -1 : i);
    showToast(wasPlaying ? '' : (lang === 'ar' ? 'معاينة صوتية — التسجيل الكامل قريبًا' : 'Audio preview — full recording coming soon'));
    if (timerRef.current) clearInterval(timerRef.current);
    if (!wasPlaying) {
      setProgress(0);
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          const next = p + 4;
          if (next >= 100) {
            clearInterval(timerRef.current);
            setPlayingSample(-1);
            return 0;
          }
          return next;
        });
      }, 200);
    }
  };

  return (
    <section id="meditations" className="section-pad" style={{ padding: '80px 32px', background: '#F5EDE0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 44, paddingBottom: 14, borderBottom: '1px solid rgba(18,63,53,.14)', justifyContent: 'flex-start' }}>
          <span style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(18,63,53,.3)' }}>{secNum}</span>
          <span style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.meditations.kicker}</span>
        </div>
        <div className="med-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 56, alignItems: 'start' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -14, border: '1px solid rgba(193,146,47,.5)', borderRadius: '50% 50% 8px 8px / 38% 38% 4px 4px' }} />
            <div style={{ position: 'relative', aspectRatio: '1/1.05', borderRadius: '50% 50% 8px 8px / 38% 38% 4px 4px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(18,63,53,.16)' }}>
              <img src="/images/pendulum-gold-sand.jpg" alt="A pendulum tracing patterns through gold sand" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div>
            <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.7rem', color: '#16211D', margin: '0 0 20px' }}>{L.meditations.title}</h2>
            <p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.75, color: 'rgba(22,33,29,.75)', margin: '0 0 32px', maxWidth: 560 }}>{L.meditations.body}</p>
            <div style={{ borderTop: '1px solid rgba(18,63,53,.14)' }}>
              {L.meditations.samples.map((s, i) => {
                const isPlaying = playingSample === i;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(18,63,53,.14)' }}>
                    <button onClick={() => play(i)} aria-label="Play sample" style={{ width: 40, height: 40, borderRadius: '50%', background: isPlaying ? '#DD8452' : '#123F35', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isPlaying ? (
                        <span style={{ width: 11, height: 11, display: 'flex', gap: 3 }}>
                          <span style={{ width: 3, height: 11, background: '#FDFBF6', borderRadius: 1 }} />
                          <span style={{ width: 3, height: 11, background: '#FDFBF6', borderRadius: 1 }} />
                        </span>
                      ) : (
                        <span style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderInlineStart: '10px solid #FDFBF6', marginInlineStart: 2 }} />
                      )}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: bodyFont, fontSize: 14.5, color: '#16211D', fontWeight: 600, marginBottom: 6 }}>{s.title}</div>
                      {isPlaying ? (
                        <div style={{ height: 3, background: 'rgba(18,63,53,.12)', borderRadius: 999, overflow: 'hidden', maxWidth: 220 }}>
                          <div style={{ height: '100%', background: '#C1922F', borderRadius: 999, width: `${progress}%`, transition: 'width .2s linear' }} />
                        </div>
                      ) : (
                        <div style={{ fontFamily: bodyFont, fontSize: 12, color: 'rgba(22,33,29,.7)' }}>{s.note}</div>
                      )}
                    </div>
                    <span style={{ fontFamily: bodyFont, fontSize: 12.5, color: 'rgba(22,33,29,.7)' }}>{s.duration}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
