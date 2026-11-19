import { useSite } from '../hooks/SiteContext.jsx';
import Section from './Section.jsx';

export default function Services() {
  const { t } = useSite();
  const s = t.services;
  return (
    <Section id="services" kicker={s.kicker} title={s.title} tone="sand" center>
      <div className="mx-auto max-w-5xl">
        {s.items.map((it) => (
          <div key={it.num} className="flex items-center justify-between gap-6 border-t border-green/15 py-6 transition hover:bg-green/[.035] max-sm:flex-col max-sm:items-start">
            <div className="flex items-baseline gap-6">
              <span className="font-serif text-[14.5px] text-terracotta">{it.num}</span>
              <div>
                <div className="mb-1.5 font-serif text-xl text-ink">{it.title}</div>
                <div className="text-[15.5px] text-ink/75">{it.desc}</div>
              </div>
            </div>
            <a href={it.href} className="btn-outline shrink-0 !px-[18px] !py-2.5 !text-sm no-underline">{s.learnMore}</a>
          </div>
        ))}
      </div>
    </Section>
  );
}
