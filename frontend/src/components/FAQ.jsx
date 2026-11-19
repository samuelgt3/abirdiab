import { useSite } from '../hooks/SiteContext.jsx';

export default function Faq() {
  const { t } = useSite();
  return (
    <section id="faq" className="section-pad scroll-mt-16">
      <div className="mx-auto max-w-[820px]">
        <div className="kicker mb-10 text-center">{t.faq.kicker}</div>
        <h2 className="mb-8 text-center font-serif text-[2rem] font-normal text-ink md:text-[2.2rem]">{t.faq.title}</h2>
        {t.faq.items.map((f, i) => (
          <details key={f.q} className="group border-b border-green/15" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-xl font-normal text-terracotta transition group-open:rotate-45">+</span>
            </summary>
            <p className="pb-5 text-[15.5px] leading-relaxed text-ink/75">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
