import { useState } from 'react';
import { useSite } from '../hooks/SiteContext.jsx';
import { useCheckout } from './checkout/CheckoutContext.jsx';
import { RuledKicker } from './About.jsx';
import AutoScrollRow from './AutoScrollRow.jsx';
import Modal from './Modal.jsx';

const IMAGES = ['pendulum-set.jpg', 'pendulum-gold-sand.jpg', 'pendulum-hand.jpg', 'pendulum-sand.jpg'];
const imageFor = (i) => `${import.meta.env.BASE_URL}images/${IMAGES[i % IMAGES.length]}`;

function dateLabel(iso, lang) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso));
}

export default function Workshops() {
  const { t, u, lang, workshops, content, pick, price } = useSite();
  const { bookWorkshop } = useCheckout();
  const [open, setOpen] = useState(null);
  const w = t.workshops;
  const list = [...workshops].sort((a, b) => (a.starts_at ? 0 : 1) - (b.starts_at ? 0 : 1));

  // seats_shown = 1 per 5 real seats left (set by the database); nothing is shown for workshops without a seat limit
  const spots = (x) => {
    if (x.sold_out) return { label: w.soldOut, scarce: true };
    if (!x.seats_shown) return { label: '', scarce: false };
    if (x.seats_shown <= 5) return { label: `${w.onlyWord} ${x.seats_shown} ${w.spotsLeft}`, scarce: true };
    return { label: `${x.seats_shown} ${w.spotsOpen}`, scarce: false };
  };

  // nothing scheduled: one compact "Coming soon" band instead of a big section with empty cards
  if (content && workshops.length === 0) {
    return (
      <section id="workshop" className="scroll-mt-16 bg-sand px-5 py-10 md:py-12">
        <div className="container-x flex flex-col items-center gap-2 text-center">
          <RuledKicker>{w.kicker}</RuledKicker>
          <h2 className="m-0 font-serif text-[1.8rem] font-normal text-ink md:text-[2.1rem]">{w.title}</h2>
          <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-terracotta/40 bg-cream px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[.06em] text-terracotta">
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />{w.comingSoon}
          </span>
          <p className="m-0 max-w-[440px] text-[15px] leading-[1.7] text-ink/70">{w.comingSoonLead}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="workshop" className="scroll-mt-16 bg-sand py-14 md:py-[88px]">
      <div className="container-x px-5 md:px-8">
        <RuledKicker>{w.kicker}</RuledKicker>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
          <h2 className="m-0 font-serif text-[2rem] font-normal text-ink md:text-[2.3rem]">{w.title}</h2>
          <p className="m-0 max-w-[420px] text-[15.5px] leading-[1.7] text-ink/70">{w.lead}</p>
        </div>

        {content && workshops.length === 0 && <p className="rounded-lg bg-cream p-6 text-ink/75">{u.noUpcoming}</p>}
      </div>

      <div>
        <AutoScrollRow fullWidth alwaysLoop labels={{ prev: w.prevLabel, next: w.nextLabel }}>
          {list.map((x, i) => {
            const s = spots(x);
            const soon = !x.starts_at; // posted without a date: shown as Coming soon, not bookable yet
            return (
              <article key={x.id ?? x.title} className="lib-card w-[280px] shrink-0 cursor-pointer self-stretch !h-auto sm:w-[320px]" onClick={() => setOpen({ ...x, _i: i })}>
                <div className="relative h-[150px] overflow-hidden bg-[#DCE7E1]">
                  <img loading="lazy" src={imageFor(i)} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  <div className={`absolute bottom-2.5 start-2.5 rounded-[3px] px-[11px] py-1.5 text-xs leading-[1.45] text-cream ${soon ? 'bg-ink/75' : 'bg-green'}`}>
                    {soon ? <div className="font-bold uppercase tracking-[.06em]">{w.comingSoon}</div> : (
                      <>
                        <div className="font-bold">{dateLabel(x.starts_at, lang)}</div>
                        <div className="opacity-85">{pick(x, 'time_label')}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 px-[18px] pb-5 pt-4">
                  <h3 className="font-serif text-lg leading-[1.35] text-ink">{pick(x, 'title')}</h3>
                  <div className="text-[13px] leading-[1.55] text-ink/70">{pick(x, 'format')}<br />{pick(x, 'duration')}</div>
                  <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-green/10 pt-2.5">
                    <span className={`flex items-center gap-[7px] text-[12.5px] font-semibold ${s.scarce ? 'text-terracotta' : 'text-green'}`}>
                      {s.label && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}{s.label}
                    </span>
                    <span className="font-serif text-lg text-green">{price(x.price_usd)}</span>
                  </div>
                  <button type="button" className="btn-outline mt-1 w-full !py-[11px] !text-[13.5px] hover:bg-green hover:!text-cream">{w.discover}</button>
                </div>
              </article>
            );
          })}
        </AutoScrollRow>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? pick(open, 'title') : ''} closeLabel={t.testimonials.closeLbl}>
        {open && (
          <div>
            <img src={imageFor(open._i)} alt="" className="-mx-6 -mt-6 mb-5 h-40 w-[calc(100%+3rem)] max-w-none object-cover md:-mx-9 md:-mt-9 md:w-[calc(100%+4.5rem)]" />
            <div className="text-sm text-terracotta">{open.starts_at ? `${dateLabel(open.starts_at, lang)} · ${pick(open, 'time_label')}` : w.comingSoon}</div>
            <h3 className="mb-4 mt-1 font-serif text-3xl text-ink">{pick(open, 'title')}</h3>
            <h4 className="font-semibold text-green">{w.overview}</h4>
            <p className="mb-4 leading-relaxed text-ink/80">{pick(open, 'overview')}</p>
            <dl className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ink/75">{w.format}</dt><dd>{pick(open, 'format')}</dd></div>
              <div><dt className="text-ink/75">{w.duration}</dt><dd>{pick(open, 'duration')}</dd></div>
            </dl>
            <button type="button" disabled={open.sold_out || !open.starts_at} onClick={() => { const ws = open; setOpen(null); bookWorkshop(ws); }} className="btn-solid w-full disabled:cursor-not-allowed disabled:opacity-50">
              {!open.starts_at ? w.comingSoon : open.sold_out ? w.soldOut : `${w.bookNow} · ${price(open.price_usd)}`}
            </button>
          </div>
        )}
      </Modal>
    </section>
  );
}
