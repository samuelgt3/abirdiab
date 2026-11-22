import { useSite } from '../hooks/SiteContext.jsx';
import { useCheckout } from './checkout/CheckoutContext.jsx';

export default function Sessions() {
  const { t, lang, price } = useSite();
  const { bookSession, settings } = useCheckout();
  const s = t.sessions;
  const length = lang === 'ar' ? settings.session_length_ar : settings.session_length;
  return (
    <section id="sessions" className="scroll-mt-16 bg-[#0f2a23] text-cream">
      <div className="grid md:grid-cols-2">
        <div className="relative min-h-[320px] overflow-hidden">
          <img loading="lazy" src={`${import.meta.env.BASE_URL}images/incense-session.jpg`}
            alt={lang === 'ar' ? "بخور يتصاعد دخانه بهدوء لجلسة شفاء فردية" : "Incense smoke curling upward, setting a calm space for a 1:1 healing session"} className="absolute inset-0 h-full w-full object-cover" />
          {/* fade the photo into the panel, on the side that touches the text */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f2a23] md:bg-gradient-to-r md:to-[#0f2a23] md:rtl:bg-gradient-to-l" />
        </div>
        <div className="px-6 py-11 md:px-14 md:py-[72px]">
          <div className="mb-3 text-[12.5px] uppercase tracking-[.08em] text-[#F2A877]">{s.kicker}</div>
          <h2 className="mb-6 font-serif text-[2rem] font-normal md:text-[2.6rem]">{s.title}</h2>
          {s.body1.split('\n\n').map((p) => (
            <p key={p} className="mb-4 text-[16px] leading-relaxed text-cream/85">{p}</p>
          ))}
          <ul className="my-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {s.checklist.map((c) => (
              <li key={c} className="flex gap-2.5 text-[15px] text-cream/90">
                <span className="mt-0.5 text-green">✓</span>{c}
              </li>
            ))}
          </ul>
          <p className="mb-7 leading-relaxed text-cream/75">{s.body2}</p>
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={bookSession} className="btn-accent">{s.cta}</button>
            <span className="text-[14px] text-cream/75">
              {length}{settings.session_price_usd ? ` · ${price(settings.session_price_usd)}` : ''}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
