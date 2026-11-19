import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSite } from '../hooks/SiteContext.jsx';
import Footer from './Footer.jsx';
import Header from './Header.jsx';

/** Shared frame for every public page: header, grain texture, footer, scroll handling. */
export default function Layout({ children }) {
  const { content, source, u } = useSite();
  const { pathname, hash } = useLocation();

  // new page -> top; "/#section" -> that section once content has rendered
  useEffect(() => {
    if (hash) {
      if (content) document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash, content]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">{u.skip}</a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      {source === 'fallback' && import.meta.env.DEV && (
        <div className="fixed bottom-3 start-3 z-[500] rounded bg-ink px-3 py-1.5 text-xs text-cream">
          dev: showing bundled content (database not reachable / not configured)
        </div>
      )}
    </>
  );
}

/** Small "← Back" link used at the top of sub-pages (arrow flips in Arabic). */
export function BackLink({ to, label, light = false }) {
  const { isRTL } = useSite();
  return (
    <Link to={to} className={`inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold no-underline ${light ? '!text-sand' : '!text-green'}`}>
      <span aria-hidden="true">{isRTL ? '→' : '←'}</span> {label}
    </Link>
  );
}
