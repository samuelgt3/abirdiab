import { useSite } from '../hooks/SiteContext.jsx';

/** Kicker on a ruled line, as used by the design for About and Workshops. */
export function RuledKicker({ children, light = false }) {
  return (
    <div className={`mb-10 flex items-baseline gap-4 border-b pb-3.5 ${light ? 'border-cream/15' : 'border-green/15'}`}>
      <span className={`text-[12.5px] uppercase tracking-[.08em] ${light ? 'text-[#F2A877]' : 'text-terracotta'}`}>{children}</span>
    </div>
  );
}

export function Ornament() {
  return (
    <div className="flex justify-center pb-5" aria-hidden="true">
      <svg width="90" height="30" viewBox="0 0 90 30" fill="none">
        <path d="M2 15C25 5 65 5 88 15" stroke="#123F35" strokeWidth="1" />
        <circle cx="30" cy="10" r="4" stroke="#C1922F" strokeWidth="1" />
        <circle cx="60" cy="10" r="4" stroke="#123F35" strokeWidth="1" />
      </svg>
    </div>
  );
}

export default function About() {
  const { t, lang } = useSite();
  const a = t.about;
  return (
    <>
      <section id="about" className="section-pad scroll-mt-16">
        <div className="container-x">
          <RuledKicker>{a.kicker}</RuledKicker>
          <div className="grid items-start gap-12 md:grid-cols-[260px_1fr]">
            <div className="relative mx-auto w-full max-w-[260px]">
              <div className="arch absolute inset-y-3.5 -end-3.5 start-3.5 bg-blush" />
              <div className="arch relative aspect-[3/3.7] overflow-hidden shadow-[0_20px_40px_rgba(18,63,53,.14)]">
                <img loading="lazy" src={`${import.meta.env.BASE_URL}images/about-calligraphy.jpg`}
                  alt={lang === 'ar' ? "عبير دياب تقف بجانب لوحة خط عربي منحوتة" : "Abir Diab standing beside a carved Arabic calligraphy panel"} className="h-full w-full object-cover" />
              </div>
            </div>
            <div>
              <h2 className="mb-6 font-serif text-[2rem] font-normal text-ink md:text-5xl">{a.title}</h2>
              <p className="mb-6 text-[17.5px] leading-[1.75] text-ink/75">{a.bio}</p>
              <p className="mb-7 border-s-2 border-gold ps-[18px] font-serif text-xl italic leading-relaxed text-green">{a.quote}</p>
              <div className="mb-11 flex flex-wrap gap-2.5">
                {a.chips.map((c) => (
                  <span key={c} className="rounded-full border border-green/15 px-4 py-2 text-sm text-green">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 grid border-y border-green/15 md:grid-cols-3">
            {a.beliefs.map((b) => (
              <div key={b.title} className="flex flex-col gap-2.5 border-green/10 px-6 py-8 md:border-e md:last:border-e-0">
                <span className="text-[14.5px] text-gold">✦</span>
                <div className="font-serif text-[22px] italic leading-snug text-green">{b.title}</div>
                <div className="text-[14.5px] leading-relaxed text-ink/75">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Ornament />
    </>
  );
}
