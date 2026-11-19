import { Link } from 'react-router-dom';
import { useSite } from '../hooks/SiteContext.jsx';
import { CONTACT_EMAIL, SOCIAL, WHATSAPP_DISPLAY, mailto, whatsapp } from '../lib/links.js';
import { InstagramIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from './Icons.jsx';

const round = 'flex h-11 w-11 items-center justify-center rounded-full border border-green/20 !text-green no-underline hover:bg-green/5';
const colHead = 'mb-3.5 text-[13px] font-bold uppercase tracking-[.05em] text-terracotta';
const link = 'inline-block py-1.5 !text-ink no-underline hover:!text-terracotta max-md:py-2.5';

/** Simple wordmark badges; swap for official logos once the payment provider is chosen. */
function PayBadge({ children, label }) {
  return (
    <span title={label} aria-label={label}
      className="flex h-[30px] min-w-[48px] items-center justify-center rounded-[5px] border border-green/15 bg-white px-2 text-[12px] font-extrabold italic tracking-tight">
      {children}
    </span>
  );
}

export default function Footer() {
  const { t, lang } = useSite();
  const f = t.footer;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-green/15 bg-cream px-5 pb-24 pt-14 md:px-8 lg:pb-7">
      <div className="container-x mb-11 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="mb-2 font-serif text-xl text-ink">{lang === 'ar' ? 'عبير دياب' : 'Abir Diab'}</div>
          <div className="mb-[18px] max-w-[240px] text-sm leading-relaxed text-ink/75">{f.tagline}</div>
          <div className="flex gap-2.5">
            <a href={SOCIAL.instagram} target="_blank" rel="noopener" aria-label="Instagram" className={round}><InstagramIcon /></a>
            <a href={SOCIAL.youtube} target="_blank" rel="noopener" aria-label="YouTube" className={round}><YouTubeIcon /></a>
            <a href={SOCIAL.tiktok} target="_blank" rel="noopener" aria-label="TikTok" className={round}><TikTokIcon /></a>
          </div>
        </div>
        <nav aria-label={f.explore}>
          <div className={colHead}>{f.explore}</div>
          <div className="flex flex-col gap-[11px] text-[14.5px]">
            <Link to="/#about" className={link}>{t.nav.about}</Link>
            <Link to="/journal" className={link}>{t.nav.journal}</Link>
            <Link to="/testimonials" className={link}>{t.nav.testimonials}</Link>
            <Link to="/#faq" className={link}>{t.nav.faq}</Link>
          </div>
        </nav>
        <nav aria-label={f.offerings}>
          <div className={colHead}>{f.offerings}</div>
          <div className="flex flex-col gap-[11px] text-[14.5px]">
            <Link to="/#sessions" className={link}>{t.nav.services}</Link>
            <Link to="/materials" className={link}>{t.nav.library}</Link>
            <Link to="/materials?type=Audio" className={link}>{t.nav.audioMeditations}</Link>
            <Link to="/#workshop" className={link}>{t.nav.workshops}</Link>
          </div>
        </nav>
        <div>
          <div className={colHead}>{f.contact}</div>
          <div className="flex flex-col gap-[11px] text-[14.5px]">
            <a href={whatsapp()} target="_blank" rel="noopener" aria-label={`WhatsApp ${WHATSAPP_DISPLAY}`}
              className="inline-flex items-center gap-2 font-bold !text-green no-underline max-md:min-h-[40px]">
              <WhatsAppIcon /> <span dir="ltr">{WHATSAPP_DISPLAY}</span>
            </a>
            <a href={mailto()} className={link}>{CONTACT_EMAIL}</a>
            <Link to="/#contact" className={link}>{t.nav.contactLabel}</Link>
          </div>
        </div>
      </div>

      <div className="container-x flex flex-wrap items-center justify-between gap-4 border-t border-green/10 pt-[22px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="me-1 text-[13px] text-ink/70">{f.payment}</span>
          <PayBadge label="Visa"><span className="text-[#1A1F71]">VISA</span></PayBadge>
          <PayBadge label="Mastercard">
            <span className="relative flex">
              <span className="h-[18px] w-[18px] rounded-full bg-[#EB001B]" />
              <span className="-ms-2 h-[18px] w-[18px] rounded-full bg-[#F79E1B] mix-blend-multiply" />
            </span>
          </PayBadge>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-ink/70">
          <Link to="/privacy" className="!text-green inline-block py-1.5 max-md:py-2.5 underline underline-offset-[3px]">{t.policy.privacyLink}</Link>
          <Link to="/terms" className="!text-green inline-block py-1.5 max-md:py-2.5 underline underline-offset-[3px]">{t.policy.termsLink}</Link>
          <Link to="/refunds" className="!text-green inline-block py-1.5 max-md:py-2.5 underline underline-offset-[3px]">{t.policy.refundLink}</Link>
          <span>© {year} Abir Diab. {f.rights}</span>
        </div>
      </div>
    </footer>
  );
}
