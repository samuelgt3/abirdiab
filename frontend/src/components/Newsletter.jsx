import { useLanguage } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { subscribe } from '../api/newsletter.js';

export default function Newsletter() {
  const { L, lang, bodyFont } = useLanguage();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type=email]').value;
    await subscribe(email);
    showToast(lang === 'ar' ? 'شكرًا لاشتراكك!' : 'Thanks for subscribing!');
    e.target.reset();
  };

  return (
    <section className="section-pad" style={{ padding: '0 32px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', background: '#EFD9D1', borderRadius: 8, padding: 50, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.9rem', color: '#16211D', margin: '0 0 10px' }}>{L.newsletter.title}</h2>
        <p style={{ fontFamily: bodyFont, fontSize: 14.5, color: 'rgba(22,33,29,.74)', margin: '0 0 24px' }}>{L.newsletter.sub}</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input type="email" required placeholder={L.newsletter.placeholder} style={{ flex: 1, minWidth: 200, border: '1px solid rgba(18,63,53,.2)', borderRadius: 2, padding: '13px 16px', fontFamily: bodyFont, fontSize: 14, background: '#FDFBF6' }} />
          <button type="submit" style={{ background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: '13px 24px', fontFamily: bodyFont, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{L.newsletter.button}</button>
        </form>
      </div>
    </section>
  );
}
