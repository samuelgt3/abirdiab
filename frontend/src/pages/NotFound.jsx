import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useSite } from '../hooks/SiteContext.jsx';

const COPY = {
  en: { h: 'We can’t find that page', p: 'The address may be mistyped, or the page may have moved.', home: 'Back to the home page', browse: 'Browse materials' },
  ar: { h: 'لم نجد هذه الصفحة', p: 'ربما كُتب العنوان بشكل خاطئ أو نُقلت الصفحة.', home: 'العودة إلى الرئيسية', browse: 'تصفحوا المواد' },
};

/** Shown for any address that does not exist (so search engines and visitors don't get the home page by mistake). */
export default function NotFound() {
  const { lang } = useSite();
  const c = COPY[lang];
  return (
    <Layout>
      <section className="mx-auto max-w-[560px] px-5 py-20 text-center md:py-28">
        <div className="mb-3 font-serif text-[4rem] leading-none text-green/40" aria-hidden="true">404</div>
        <h1 className="mb-3 font-serif text-[2rem] font-normal text-ink">{c.h}</h1>
        <p className="mb-7 text-[16px] text-ink/75">{c.p}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-solid !text-cream no-underline">{c.home}</Link>
          <Link to="/materials" className="btn-outline no-underline">{c.browse}</Link>
        </div>
      </section>
    </Layout>
  );
}
