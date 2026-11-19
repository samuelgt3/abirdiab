import { useSite } from '../hooks/SiteContext.jsx';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, mailto, whatsapp } from '../lib/links.js';
import { WhatsAppIcon } from './Icons.jsx';

export default function Contact() {
  const { t } = useSite();
  const c = t.contact;
  return (
    <section id="contact" className="section-pad relative scroll-mt-16 overflow-hidden bg-[radial-gradient(circle_at_85%_20%,#1D5B4C,#123F35_55%,#0c1c17)] text-cream">
      <img loading="lazy" src={`${import.meta.env.BASE_URL}images/pendulum-sand.jpg`} alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.08] mix-blend-luminosity" />
      <div className="container-x relative">
        <div className="mb-10 text-center text-[12.5px] uppercase tracking-[.08em] text-[#F2A877]">{c.kicker}</div>
        <div className="grid items-start gap-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="mb-5 font-serif text-[2rem] font-normal leading-tight md:text-[2.8rem]">{c.title}</h2>
            <p className="mb-7 max-w-md text-[16.5px] leading-relaxed text-cream/80">{c.body}</p>
            <ul className="space-y-2 text-[15px] text-cream/85">
              <li>
                <a href={whatsapp()} target="_blank" rel="noopener" className="inline-flex items-center gap-2.5 text-[17px] font-semibold !text-cream no-underline max-md:min-h-[44px]">
                  <WhatsAppIcon /> <span dir="ltr">{WHATSAPP_DISPLAY}</span>
                </a>
              </li>
              <li><a href={mailto()} className="inline-flex items-center !text-cream/85 hover:!text-accent max-md:min-h-[44px]">{CONTACT_EMAIL}</a></li>
              <li>{c.appointment}</li>
              <li>{c.languages}</li>
            </ul>
          </div>
          <div className="rounded-md border border-cream/15 bg-cream/[.06] p-7">
            <h3 className="mb-2 font-serif text-[1.4rem] font-normal">{c.cardTitle}</h3>
            <p className="mb-6 text-[15px] text-cream/80">{c.cardLead}</p>
            <div className="flex flex-col gap-3">
              <a href={whatsapp()} target="_blank" rel="noopener" className="btn-accent gap-2 no-underline">
                <WhatsAppIcon /> {c.waBtn}
              </a>
              <a href={mailto()} className="btn border border-cream/45 !text-cream no-underline">{c.emailBtn}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
