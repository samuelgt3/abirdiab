import { useLanguage } from '../context/LanguageContext.jsx';

const SOCIALS = [
  { href: 'https://instagram.com/abir_diaab', label: 'IG', name: 'Instagram' },
  { href: 'https://youtube.com/@Abir_Diab', label: 'YT', name: 'YouTube' },
  { href: 'https://tiktok.com/@.abir.diab', label: 'TT', name: 'TikTok' },
];

export default function Watch({ secNum }) {
  const { L, bodyFont } = useLanguage();

  return (
    <section id="watch" className="section-pad" style={{ position: 'relative', overflow: 'hidden', background: '#123F35', minHeight: '92vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="watch-grid" style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 560 }}>
        <div style={{ padding: '76px 60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 28 }}>
            <span style={{ fontFamily: 'Newsreader,serif', fontSize: '1.5rem', color: 'rgba(253,251,246,.35)' }}>{secNum}</span>
            <span style={{ fontFamily: bodyFont, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#DD8452' }}>{L.watch.kicker}</span>
          </div>
          <h2 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '2.5rem', color: '#FDFBF6', margin: '0 0 18px' }}>{L.watch.title}</h2>
          <p style={{ fontFamily: bodyFont, fontSize: 15.5, lineHeight: 1.75, color: 'rgba(253,251,246,.72)', maxWidth: 400, margin: '0 0 36px' }}>{L.watch.body}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid rgba(253,251,246,.3)', borderRadius: 999, padding: '9px 16px 9px 10px', color: '#FDFBF6', fontFamily: bodyFont, fontSize: 13 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#DD8452', color: '#16211D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700 }}>{s.label}</span>{s.name}
              </a>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', display: 'grid', gridTemplateRows: '1fr 1fr', gap: 2 }}>
          <a href="https://youtube.com/@Abir_Diab" target="_blank" rel="noopener" style={{ position: 'relative', display: 'block', overflow: 'hidden' }}>
            <img src="/images/abir-media-1-sm.png" alt="Abir Diab speaking during a filmed conversation about energy healing" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .5s ease' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,26,21,0) 50%,rgba(10,26,21,.65))' }} />
            <span style={{ position: 'absolute', top: '50%', insetInlineStart: '50%', transform: 'translate(-50%,-50%)', width: 52, height: 52, borderRadius: '50%', background: 'rgba(253,251,246,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderInlineStart: '14px solid #123F35', marginInlineStart: 3 }} />
            </span>
            <span style={{ position: 'absolute', bottom: 16, insetInlineStart: 20, color: '#FDFBF6', fontFamily: bodyFont, fontSize: 13 }}>{L.watch.ytLabel}</span>
          </a>
          <a href="https://youtube.com/@Abir_Diab" target="_blank" rel="noopener" style={{ position: 'relative', display: 'block', overflow: 'hidden' }}>
            <img src="/images/abir-media-2-sm.png" alt="Abir Diab being interviewed on a podcast about her practice" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .5s ease' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,26,21,0) 50%,rgba(10,26,21,.65))' }} />
            <span style={{ position: 'absolute', top: '50%', insetInlineStart: '50%', transform: 'translate(-50%,-50%)', width: 52, height: 52, borderRadius: '50%', background: 'rgba(253,251,246,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderInlineStart: '14px solid #123F35', marginInlineStart: 3 }} />
            </span>
            <span style={{ position: 'absolute', bottom: 16, insetInlineStart: 20, color: '#FDFBF6', fontFamily: bodyFont, fontSize: 13 }}>{L.watch.secondVideoTitle}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
