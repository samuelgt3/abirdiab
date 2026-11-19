import { Link } from 'react-router-dom';
import { useSite } from '../hooks/SiteContext.jsx';
import { useCheckout } from './checkout/CheckoutContext.jsx';

export default function Hero() {
  const { t, u, lang, content, price } = useSite();
  const { bookSession } = useCheckout();
  const h = t.hero;
  const marquee = [...t.about.chips, ...t.services.items.map((s) => s.title)];
  const cheapest = content?.courses?.filter((c) => !c.is_free && c.price_usd > 0).reduce((m, c) => Math.min(m, c.price_usd), Infinity);

  return (
    <>
      <section className="relative overflow-hidden px-5 pb-10 pt-10 md:px-8">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="mb-5 inline-block rounded-full border border-accent/40 px-4 py-1.5 text-[13.5px] text-terracotta">
              ✦ {h.eyebrow}
            </span>
            <h1 className="mb-6 font-serif text-[2.1rem] font-normal leading-[1.14] text-ink sm:text-[2.8rem] lg:text-[4.2rem]">
              {h.pre} <em className="italic text-terracotta">{h.accent}</em> {h.post}
            </h1>
            <p className="mb-8 max-w-[520px] text-lg leading-[1.7] text-ink/70">{h.lead}</p>
            <div className="mb-4 flex flex-wrap gap-4">
              <button type="button" onClick={bookSession} className="btn-solid !px-7 !py-4">
                {h.cta1}
              </button>
              <Link to="/materials" className="btn-outline !px-7 !py-4 no-underline">{h.cta2}</Link>
            </div>
            {Number.isFinite(cheapest) && (
              <div className="text-[13.5px] text-ink/70">
                {u.priceHintPrefix} {price(cheapest)}
              </div>
            )}
          </div>
          <div className="relative justify-self-center">
            <div className="arch pointer-events-none absolute -inset-[26px] animate-ring-cw border border-gold/50" />
            <div className="arch relative h-[400px] w-[320px] max-w-[80vw] overflow-hidden shadow-[0_30px_60px_rgba(18,63,53,.18)]">
              <img
                src={`${import.meta.env.BASE_URL}images/portrait.jpg`}
                alt={lang === 'ar' ? "عبير دياب تبتسم بدفء وهي جالسة في استوديو بإضاءة هادئة" : "Abir Diab smiling warmly, seated in a softly lit studio"}
                fetchpriority="high"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-[18px] -start-4 max-w-[200px] rounded-md bg-green px-5 py-3.5 text-[13.5px] text-cream shadow-[0_14px_30px_rgba(0,0,0,.2)] md:-start-[30px]">
              {h.since}
            </div>
          </div>
        </div>
        <dl className="container-x relative z-[2] mt-14 grid max-w-[1000px] grid-cols-2 rounded-md bg-cream shadow-[0_20px_50px_rgba(18,63,53,.12)] md:grid-cols-4">
          {t.stats.map((s) => (
            <div key={s.label} className="border-e border-green/10 px-5 py-6 text-center last:border-e-0">
              <dt className="font-serif text-[2rem] text-green">{s.n}</dt>
              <dd className="mt-1 text-[13px] text-ink/70">{s.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="overflow-hidden bg-[radial-gradient(circle_at_85%_20%,#3a2416,#123F35_55%,#0c1c17)] py-5" aria-hidden="true">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {[...marquee, ...marquee].map((m, i) => (
            <span key={i} className="whitespace-nowrap px-[26px] font-serif text-xl italic text-sand">
              {m} <span className="text-gold">✦</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
