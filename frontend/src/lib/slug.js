/** URL-friendly id from an English title: "Why “Normal” Isn’t the Goal" -> "why-normal-isnt-the-goal". */
export function slugify(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘"“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

/** Find a row by the slug of its English title. */
export const findBySlug = (rows, slug) => (rows || []).find((r) => slugify(r.title) === slug) || null;

export const coursePath = (c) => `/materials/${slugify(c.title)}`;
export const postPath = (p) => `/journal/${slugify(p.title)}`;
