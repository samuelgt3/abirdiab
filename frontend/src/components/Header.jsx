import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSite } from '../hooks/SiteContext.jsx';
import acct from '../content/account.json';
import { useAuth } from '../hooks/AuthContext.jsx';
import CurrencyMenu from './CurrencyMenu.jsx';
import { useCheckout } from './checkout/CheckoutContext.jsx';

function shortDate(iso, lang) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso));
}

export default function Header() {
  const { t, u, lang, setLang, workshops, pick, currency, setCurrency, homeCurrency, currencyCodes } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bar, setBar] = useState(true);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const { pathname } = useLocation();
  useEffect(() => setMenu(false), [pathname]);
  const menuBtn = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setMenu(false); menuBtn.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);
  // the floating 1:1 button hides while the footer is on screen, so it never covers footer links
  const [atFooter, setAtFooter] = useState(false);
  useEffect(() => {
    const f = document.querySelector('footer');
    if (!f || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), { threshold: 0.05 });
    io.observe(f);
    return () => io.disconnect();
  }, [pathname]);

  // home sections are "/#id"; Materials, Journal and Testimonials are their own pages
  const links = [
    { to: '/#about', label: t.nav.about },
    { to: '/#services', label: t.nav.services },
    { to: '/#workshop', label: t.nav.workshops },
    { to: '/materials', label: t.nav.library, page: true, sub: [
      { to: '/materials?type=Video', label: t.nav.videoCourses },
      { to: '/materials?type=Audio', label: t.nav.audioMeditations },
      { to: '/materials?type=PDF', label: t.nav.guides },
      { to: '/materials', label: t.nav.allCourses, strong: true },
    ] },
    { to: '/journal', label: t.nav.journal, page: true },
    { to: '/testimonials', label: t.nav.testimonials, page: true },
    { to: '/account', label: t.nav.myItems, page: true }, // the same area as the account button (bookings, workshops, learning)
  ];
  const isActive = (l) => l.page && pathname.startsWith(l.to);
  const next = workshops.find((x) => x.starts_at); // "coming soon" workshops have no date yet
  const { bookSession } = useCheckout();
  const { user, openAuth } = useAuth();
  const ac = acct[lang];

  // publish the sticky header's real height (urgency bar + header) as --hdr-h for sub-page sticky bars
  const wrap = useRef(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        document.documentElement.style.setProperty('--hdr-h', `${Math.round(el.getBoundingClientRect().height)}px`));
    };
    update();
    // the header changes height when the urgency bar appears and when it shrinks on scroll (animated)
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('scroll', update, { passive: true });
    el.addEventListener('transitionend', update);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', update);
      el.removeEventListener('transitionend', update);
    };
  }, []);

  return (
    <>
      {next && bar && (
          <div className="relative z-[191] flex items-center justify-center gap-2.5 bg-green px-12 py-2 text-center text-[13.5px] text-cream">
            <span className="h-[7px] w-[7px] shrink-0 animate-pulsedot rounded-full bg-gold" />
            <Link to="/#workshop" className="!text-cream underline decoration-cream/45 underline-offset-4">
              {u.nextWorkshop}: {pick(next, 'title')} · {shortDate(next.starts_at, lang)}
              {next.sold_out ? ` — ${t.workshops.soldOut}` : next.seats_shown ? ` — ${next.seats_shown} ${u.seatsLeft}` : ''}
            </Link>
            <button type="button" onClick={() => setBar(false)} aria-label={lang === 'ar' ? "إغلاق" : "Dismiss"}
              className="absolute end-1 top-1/2 h-10 w-10 -translate-y-1/2 text-xl text-cream/80">×</button>
          </div>
        )}
      <div ref={wrap} className="sticky top-0 z-[190] bg-cream">
        <header className={`border-b transition ${scrolled ? 'border-green/10 bg-cream/95 shadow-[0_6px_20px_rgba(18,63,53,.08)] backdrop-blur' : 'border-transparent bg-cream'}`}>
          <div className={`container-x !max-w-[1480px] flex items-center justify-between gap-5 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-x-10 px-4 transition-all md:px-8 ${scrolled ? 'py-2.5' : 'py-4'}`}>
            <Link to="/" className="flex min-h-[44px] w-fit items-center gap-2.5 !text-ink no-underline">
              <span className="relative h-[30px] w-[30px] shrink-0">
                <span className="absolute inset-0 border-[1.5px] border-green" style={{ borderRadius: '50% 50% 4px 4px / 42% 42% 3px 3px' }} />
                <span className="absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="whitespace-nowrap font-serif text-[19px] tracking-wide">{lang === 'ar' ? 'عبير دياب' : 'Abir Diab'}</span>
            </Link>
            <nav className="hidden gap-5 text-[14px] xl:gap-7 xl:text-[14.5px] lg:flex lg:justify-self-center" aria-label="Main">
              {links.map((l) => (
                <div key={l.to} className="group relative">
                  <Link to={l.to} aria-current={isActive(l) ? 'page' : undefined} onClick={(e) => e.currentTarget.blur()}
                    className={`no-underline hover:!text-terracotta ${isActive(l) ? '!text-terracotta' : '!text-ink'}`}>
                    {l.label}
                  </Link>
                  {l.sub && (
                    <div className="invisible absolute start-0 top-full z-[60] min-w-[180px] pt-3.5 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                      <div className="flex flex-col rounded-md border border-green/15 bg-cream p-1.5 shadow-[0_12px_24px_rgba(18,63,53,.14)]">
                        {l.sub.map((s) => (
                          <Link key={s.to} to={s.to} onClick={(e) => e.currentTarget.blur()}
                            className={`rounded-[3px] px-3.5 py-2.5 text-[14.5px] no-underline hover:bg-sand ${s.strong ? 'font-semibold !text-terracotta' : '!text-ink'}`}>
                            {s.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <div className="flex items-center gap-2 sm:gap-3 lg:justify-self-end">
              {/* currency and language in one small pill: [ETB ▾ | EN | عربي] */}
              <div role="group" aria-label={lang === 'ar' ? 'العملة واللغة' : 'Currency and language'} dir="ltr"
                className="flex items-stretch rounded-full border border-green/25 text-[12.5px] leading-none">
                <CurrencyMenu lang={lang} currency={currency} home={homeCurrency} codes={currencyCodes} onPick={setCurrency} />
                <span className="my-2 w-px bg-green/20" aria-hidden="true" />
                {[['en', 'EN'], ['ar', 'عربي']].map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={lang === k} onClick={() => setLang(k)}
                    className={`min-h-[44px] px-3 py-2.5 transition sm:min-h-0 ${k === 'ar' ? 'rounded-e-full' : ''} ${lang === k ? 'bg-green font-semibold text-cream' : 'text-green hover:bg-green/5'}`}>{label}</button>
                ))}
              </div>
              <button type="button" onClick={bookSession}
                className="btn-solid hidden whitespace-nowrap !px-4 !py-2 !text-[12.5px] hover:-translate-y-0.5 md:inline-flex">
                {u.oneOnOne}
              </button>
              <button ref={menuBtn} type="button" aria-label={lang === 'ar' ? "القائمة" : "Menu"} aria-expanded={menu} onClick={() => setMenu(!menu)}
                className="flex h-11 min-w-11 items-center justify-center text-[22px] text-green lg:hidden">☰</button>
            </div>
          </div>
          {menu && (
            <div className="flex flex-col gap-3.5 border-t border-green/10 bg-cream px-8 py-4 text-[15.5px] lg:hidden">
              {links.map((l) => (
                <div key={l.to} className="flex flex-col gap-2.5">
                  <Link to={l.to} onClick={() => setMenu(false)} className={`no-underline ${isActive(l) ? '!text-terracotta' : '!text-ink'}`}>{l.label}</Link>
                  {l.sub && (
                    <div className="flex flex-col gap-2.5 ps-4">
                      {l.sub.slice(0, 3).map((s) => (
                        <Link key={s.to} to={s.to} onClick={() => setMenu(false)} className="text-sm !text-ink/75 no-underline">{s.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {user ? (
                <Link to="/account" onClick={() => setMenu(false)} className="!text-ink no-underline">{ac.myAccount}</Link>
              ) : (
                <button type="button" onClick={() => { setMenu(false); openAuth({ mode: 'in' }); }} className="btn-outline !py-2.5">{ac.signInUp}</button>
              )}
              <button type="button" onClick={() => { setMenu(false); bookSession(); }} className="btn-solid mt-2">{u.oneOnOne}</button>
            </div>
          )}
        </header>
      </div>

      {/* floating booking button on phones/tablets (design: .float-book) */}
      <button type="button" onClick={bookSession}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-[max(1rem,env(safe-area-inset-right))] z-[180] flex items-center gap-2 rounded-full bg-green px-5 py-3.5 text-[15px] font-semibold text-cream shadow-[0_12px_28px_rgba(18,63,53,.35)] transition lg:hidden ${atFooter ? 'pointer-events-none translate-y-6 opacity-0' : ''}`} tabIndex={atFooter ? -1 : 0} aria-hidden={atFooter || undefined}>
        <span className="text-[17px]">✦</span>{u.oneOnOne}
      </button>
    </>
  );
}
