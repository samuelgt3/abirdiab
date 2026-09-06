const TERMS_EN = ['Reiki', 'Pranic Healing', 'Hypnosis', 'Dowsing', 'Pendulum Healing', 'Miraculous Monday'];
const TERMS_AR = ['ريكي', 'الشفاء البراني', 'التنويم', 'التنقيط', 'الشفاء بالبندول', 'الاثنين المُعجزة'];

import { useLanguage } from '../context/LanguageContext.jsx';

export default function Marquee() {
  const { lang } = useLanguage();
  const terms = lang === 'ar' ? TERMS_AR : TERMS_EN;
  const doubled = terms.concat(terms);

  return (
    <div style={{ overflow: 'hidden', background: 'radial-gradient(circle at 85% 20%,#3a2416,#123F35 55%,#0c1c17)', padding: '20px 0' }}>
      <div className="marquee-track" style={{ display: 'flex', width: 'max-content', animation: 'marquee-scroll 26s linear infinite' }}>
        {doubled.map((m, i) => (
          <span key={i} style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 20, color: '#F5EDE0', padding: '0 26px', whiteSpace: 'nowrap' }}>
            {m} <span style={{ color: '#C1922F' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
