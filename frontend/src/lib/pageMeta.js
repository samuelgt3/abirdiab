import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BRAND = { en: 'Abir Diab', ar: 'عبير دياب' };

/** Titles + descriptions for the fixed pages. noindex = keep search engines away (private or empty pages). */
export const PAGES = {
  home: { en: ['Abir Diab — Energy Healing & Therapy', '1:1 energy healing sessions, guided meditations, courses and live workshops with Abir Diab.'], ar: ['عبير دياب — الشفاء بالطاقة والعلاج', 'جلسات شفاء بالطاقة فردية، وتأملات موجّهة، ودورات، وورش مباشرة مع عبير دياب.'] },
  materials: { en: ['Courses, Meditations & Manuals', 'Guided meditations, video courses and practical manuals for energy healing, pendulum work, Reiki and more.'], ar: ['دورات وتأملات وكتيبات', 'تأملات موجّهة ودورات مرئية وكتيبات عملية في الشفاء بالطاقة والبندول والريكي وغيرها.'] },
  journal: { en: ['Journal', 'Reflections and practical notes on energy healing, grounding and emotional release.'], ar: ['المدونة', 'تأملات وملاحظات عملية عن الشفاء بالطاقة والتأريض والتحرر العاطفي.'] },
  testimonials: { en: ['Client voices', 'What clients say after their sessions, shared with permission.'], ar: ['أصوات العملاء', 'ما يقوله العملاء بعد جلساتهم، بإذنهم.'] },
  terms: { en: ['Terms of Use', 'The terms for using this website, booking sessions and buying materials.'], ar: ['شروط الاستخدام', 'شروط استخدام الموقع وحجز الجلسات وشراء المواد.'] },
  privacy: { en: ['Privacy Policy', 'What we collect, why, who we share it with, and your rights.'], ar: ['سياسة الخصوصية', 'ما نجمعه ولماذا ومع من نشاركه وحقوقكم.'] },
  refunds: { en: ['Refund Policy', 'Our policy on refunds and cancellations.'], ar: ['سياسة الاسترداد', 'سياستنا بشأن الاسترداد والإلغاء.'] },
  account: { en: ['My account', ''], ar: ['حسابي', ''], noindex: true },
  booking: { en: ['Your booking', ''], ar: ['حجزكم', ''], noindex: true },
  gift: { en: ['Your gift', ''], ar: ['هديتكم', ''], noindex: true },
  payment: { en: ['Payment', ''], ar: ['الدفع', ''], noindex: true },
  notfound: { en: ['Page not found', 'This page does not exist.'], ar: ['الصفحة غير موجودة', 'هذه الصفحة غير موجودة.'], noindex: true },
};

export const siteUrl = () => (import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');

/** "Page title | Abir Diab" (the home page uses its full title). */
export const fullTitle = (title, lang) => (title ? `${title} | ${BRAND[lang] || BRAND.en}` : BRAND[lang] || BRAND.en);

function setMeta(name, content, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!content) { el?.remove(); return; }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

/** Sets the browser tab title, description, canonical address and robots flag for the current page. */
export function usePageMeta({ title, description, noindex = false, home = false, lang = 'en' }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!title) return;
    const t = home ? title : fullTitle(title, lang);
    document.title = t;
    setMeta('description', description || '');
    setMeta('robots', noindex ? 'noindex, nofollow' : '');
    setMeta('og:title', t, 'property');
    setMeta('og:description', description || '', 'property');
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
    link.setAttribute('href', siteUrl() + (pathname === '/' ? '/' : pathname.replace(/\/$/, '')));
  }, [title, description, noindex, home, lang, pathname]);
}
