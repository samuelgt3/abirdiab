import { useLanguage } from '../context/LanguageContext.jsx';
import { useAdmin } from '../context/AdminContext.jsx';
import { useTestimonials } from '../context/TestimonialsContext.jsx';

export default function Testimonials({ secNum }) {
  const { L, bodyFont } = useLanguage();
  const { manageMode } = useAdmin();
  const { testimonials, updateField, removeTestimonial, addTestimonial } = useTestimonials();

  return (
    <section id="testimonials" className="section-pad" style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(158deg,#0a1a15 0%,#123F35 58%,#1D5B4C 100%)', padding: '84px 32px' }}>
      <img src="/images/pendulum-set.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .08, mixBlendMode: 'luminosity' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(253,251,246,.35)', marginBottom: 4 }}>{secNum}</div>
            <div style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.testimonials.kicker}</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.7rem', color: '#FDFBF6', margin: 0, textAlign: 'center' }}>{L.testimonials.title}</h2>
              {manageMode && (
                <button onClick={addTestimonial} style={{ border: '1px solid #F5EDE0', color: '#F5EDE0', background: 'none', borderRadius: 2, padding: '8px 14px', fontFamily: bodyFont, fontSize: 13, cursor: 'pointer' }}>+ {L.testimonials.add}</button>
              )}
            </div>
            <div className="group-photo-row" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 40 }}>
              <img src="/images/group.jpg" alt="Group of participants smiling together after a Miraculous Monday healing circle" style={{ width: '100%', maxWidth: 520, height: 220, objectFit: 'cover', borderRadius: 6 }} />
              <p style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(253,251,246,.7)', lineHeight: 1.7, maxWidth: 360 }}>{L.testimonials.groupCaption}</p>
            </div>
            <div className="testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
              {testimonials.map((t) => (
                <div key={t.id} style={{ background: 'rgba(253,251,246,.06)', border: '1px solid rgba(253,251,246,.12)', borderRadius: 6, padding: 24 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: t.gradient, flexShrink: 0 }} />
                    <div>
                      {manageMode ? (
                        <input value={t.name} onChange={(e) => updateField(t.id, 'name', e.target.value)} style={{ fontFamily: 'Newsreader,serif', fontSize: 15, color: '#FDFBF6', background: 'rgba(253,251,246,.12)', border: '1px solid rgba(253,251,246,.5)', borderRadius: 2, padding: '4px 8px', marginBottom: 4, display: 'block' }} />
                      ) : (
                        <div style={{ fontFamily: 'Newsreader,serif', fontSize: 15, color: '#FDFBF6' }}>{t.name}</div>
                      )}
                      <div style={{ fontFamily: bodyFont, fontSize: 11.5, color: '#C1922F' }}>{t.role}</div>
                    </div>
                  </div>
                  {manageMode ? (
                    <textarea value={t.quote} onChange={(e) => updateField(t.id, 'quote', e.target.value)} style={{ width: '100%', fontFamily: bodyFont, fontSize: 14, color: '#FDFBF6', background: 'rgba(253,251,246,.1)', border: '1px solid rgba(253,251,246,.5)', borderRadius: 2, padding: 8, lineHeight: 1.6, minHeight: 70 }} />
                  ) : (
                    <p style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(253,251,246,.85)', lineHeight: 1.7, margin: 0 }}>&ldquo;{t.quote}&rdquo;</p>
                  )}
                  {manageMode && (
                    <button onClick={() => removeTestimonial(t.id)} style={{ marginTop: 10, fontSize: 11.5, fontFamily: bodyFont, border: '1px solid rgba(253,251,246,.3)', color: '#F5EDE0', background: 'none', borderRadius: 2, padding: '6px 10px', cursor: 'pointer' }}>{L.testimonials.remove}</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
