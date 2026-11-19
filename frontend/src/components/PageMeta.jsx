import { useSite } from '../hooks/SiteContext.jsx';
import { PAGES, usePageMeta } from '../lib/pageMeta.js';

/** Put one of these above a page to set its title, description and search-engine flag (see PAGES in lib/pageMeta.js). */
export default function PageMeta({ k }) {
  const { lang } = useSite();
  const p = PAGES[k];
  const [title, description] = p[lang];
  usePageMeta({ title, description, noindex: !!p.noindex, home: k === 'home', lang });
  return null;
}
