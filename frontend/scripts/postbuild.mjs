// Also writes a copy of index.html into a folder for every known page (/materials/index.html ...), so hosts such as Cloudflare Pages
//    answer real pages with 200 and unknown addresses with the real 404 (404.html).
// Runs after `vite build`: writes dist/sitemap.xml and dist/robots.txt (when the public address is known) and dist/404.html.
//  - VITE_SITE_URL  e.g. https://abirdiab.github.io/abir-site   (no trailing slash). Without it no sitemap is written.
//  - 404.html is a copy of index.html: static hosts such as GitHub Pages serve it (with a real 404 status) for any address that
//    is not a file, and the app then shows its "page not found" screen.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const site = (process.env.VITE_SITE_URL || '').replace(/\/$/, '');
const dist = new URL('../dist/', import.meta.url);

if (existsSync(new URL('index.html', dist))) copyFileSync(new URL('index.html', dist), new URL('404.html', dist));

const slugify = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’‘"“”]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

async function titles(table) {
  const url = process.env.VITE_SUPABASE_URL; const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/${table}?select=title&published=eq.true`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (r.ok) return (await r.json()).map((x) => x.title);
    } catch { /* fall back to the bundled content */ }
  }
  const fb = JSON.parse(readFileSync(new URL('../src/data/fallback.json', import.meta.url), 'utf8'));
  return (fb[table] || []).map((x) => x.title);
}

if (site) {
  const paths = ['/', '/materials', '/journal', '/testimonials', '/terms', '/privacy', '/refunds'];
  for (const t of await titles('courses')) paths.push(`/materials/${slugify(t)}`);
  for (const t of await titles('journal_posts')) paths.push(`/journal/${slugify(t)}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${site}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
  writeFileSync(new URL('sitemap.xml', dist), xml);
  writeFileSync(new URL('robots.txt', dist), `User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /booking/\nDisallow: /gift/\nDisallow: /payment/\n\nSitemap: ${site}/sitemap.xml\n`);
  console.log(`sitemap.xml: ${paths.length} addresses`);
} else {
  console.log('VITE_SITE_URL not set: no sitemap written (the site works without it).');
}

// A folder copy of index.html for every page we know about (so they are not served as "404")
const known = ['/materials', '/journal', '/testimonials', '/terms', '/privacy', '/refunds', '/account', '/payment/return', '/admin'];
const more = site ? [] : [];
for (const t of await titles('courses')) known.push(`/materials/${slugify(t)}`);
for (const t of await titles('journal_posts')) known.push(`/journal/${slugify(t)}`);
for (const p of [...known, ...more]) {
  const dir = new URL(`.${p}/`, dist);
  mkdirSync(dir, { recursive: true });
  copyFileSync(new URL('index.html', dist), new URL('index.html', dir));
}
console.log(`page copies: ${known.length}`);
