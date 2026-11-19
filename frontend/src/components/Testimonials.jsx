import { Link } from 'react-router-dom';
import { useSite } from '../hooks/SiteContext.jsx';

const GRADIENTS = [
  'linear-gradient(135deg,#DD8452,#C1922F)',
  'linear-gradient(135deg,#123F35,#1D5B4C)',
  'linear-gradient(135deg,#C06B3C,#16211D)',
  'linear-gradient(135deg,#1D5B4C,#C1922F)',
];
const img = (n) => `${import.meta.env.BASE_URL}images/${n}`;

/** Home-page testimonials: group photo + four written quotes; the full page lives at /testimonials. */
export default function Testimonials() {
  const { t, lang, content, pick } = useSite();
  const q = t.testimonials;
  const featured = (content?.testimonials || []).filter((x) => x.kind === 'written').slice(0, 4);

  return (
    <section id="testimonials" className="section-pad relative scroll-mt-16 overflow-hidden bg-[linear-gradient(158deg,#0a1a15_0%,#123F35_58%,#1D5B4C_100%)] text-cream">
      <img loading="lazy" src={img('pendulum-set.jpg')} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.08] mix-blend-luminosity" />
      <div className="container-x relative">
        <div className="mb-10 text-center text-[12.5px] uppercase tracking-[.08em] text-[#F2A877]">{q.kicker}</div>
        <h2 className="mb-4 text-center font-serif text-[2rem] font-normal text-cream md:text-[2.7rem]">{q.title}</h2>
        <div className="mb-10 flex flex-col items-start gap-4 md:flex-row md:items-center">
          <img loading="lazy" src={img('group-circle.jpg')} alt={lang === 'ar' ? "مجموعة من المشاركين يبتسمون معاً بعد حلقة شفاء" : "Group of participants smiling together after a Miraculous Monday healing circle"}
            className="h-[220px] w-full max-w-[520px] rounded-md object-cover" />
          <p className="max-w-[360px] text-[15.5px] leading-[1.7] text-cream/70">{q.groupCaption}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {featured.map((x, i) => (
            <figure key={x.id ?? x.name} className="m-0 rounded-md border border-cream/[.12] bg-cream/[.06] p-6">
              <div className="mb-3.5 flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-full" style={{ background: GRADIENTS[i % GRADIENTS.length] }} />
                <div>
                  <div className="font-serif text-[15.5px] text-cream">{pick(x, 'name')}</div>
                  <div className="text-[13px] text-gold-soft">{pick(x, 'role')}</div>
                </div>
              </div>
              <blockquote className="m-0 text-[15.5px] leading-[1.7] text-cream/85">“{pick(x, 'quote')}”</blockquote>
            </figure>
          ))}
        </div>
        <div className="mt-9 flex justify-center">
          <Link to="/testimonials"
            className="inline-flex items-center gap-2.5 rounded-full border border-cream/45 px-6 py-3 text-[14.5px] font-semibold !text-cream no-underline hover:bg-cream/10">
            {q.readMore} <span className="rtl:-scale-x-100">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
