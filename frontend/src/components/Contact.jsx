import { useLanguage } from '../context/LanguageContext.jsx';

export default function Contact() {
  const { L, bodyFont } = useLanguage();

  return (
    <section id="contact" className="section-pad" style={{ position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse at 12% 108%,#1D5B4C,#123F35 42%,#08130f 100%)', padding: '80px 32px' }}>
      <img src="/images/pendulum-sand.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .08, mixBlendMode: 'luminosity' }} />
      <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(253,251,246,.35)', marginBottom: 4 }}>10</div>
          <div style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.contact.kicker}</div>
        </div>
        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 50, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '3rem', color: '#FDFBF6', margin: '0 0 24px', lineHeight: 1.15 }}>{L.contact.title}</h2>
            <p style={{ fontFamily: bodyFont, fontSize: 15.5, lineHeight: 1.75, color: 'rgba(253,251,246,.78)', margin: '0 0 28px' }}>{L.contact.body}</p>
            <div style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(253,251,246,.85)', lineHeight: 2 }}>
              <div>{L.contact.email}</div>
              <div>{L.contact.appointment}</div>
              <div>{L.contact.languages}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(253,251,246,.07)', border: '1px solid rgba(253,251,246,.15)', borderRadius: 6, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: 'Newsreader,serif', fontSize: 17, color: '#FDFBF6', marginBottom: 6 }}>{L.contact.whatsapp}</div>
            <a href="https://wa.me/201080736170" target="_blank" rel="noopener" className="btn-accent" style={{ background: '#DD8452', color: '#16211D', textAlign: 'center', borderRadius: 2, padding: 13, fontFamily: bodyFont, fontWeight: 600, fontSize: 14 }}>+20 108 073 6170</a>
            <a href="https://wa.me/201007778908" target="_blank" rel="noopener" style={{ border: '1px solid rgba(253,251,246,.4)', color: '#FDFBF6', textAlign: 'center', borderRadius: 2, padding: 13, fontFamily: bodyFont, fontWeight: 600, fontSize: 14 }}>+20 100 777 8908</a>
          </div>
        </div>
      </div>
    </section>
  );
}
