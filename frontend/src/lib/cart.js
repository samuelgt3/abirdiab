const KEY = 'abir-cart';

/** What the cart remembers about a course (enough to show it and to buy it). */
export const cartItem = (c) => ({
  id: c.id, title: c.title, title_ar: c.title_ar || '', type: c.type, image_url: c.image_url || '',
  price_usd: Number(c.price_usd) || 0, is_free: !!c.is_free || !Number(c.price_usd),
});

export function readCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => x && x.id && x.title) : [];
  } catch { return []; }
}

export function writeCart(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode: the cart still works until the page closes */ }
}

/** Adds a course once (a second add changes nothing). */
export const addItem = (items, course) => (items.some((x) => x.id === course.id) ? items : [...items, cartItem(course)]);
export const removeItem = (items, id) => items.filter((x) => x.id !== id);

/**
 * Brings saved cart items up to date with the live course list: current title and price, and items that were
 * removed or unpublished drop out. Returns { items, changed } where changed lists what moved (for a notice).
 */
export function syncCart(items, courses) {
  const live = new Map((courses || []).map((c) => [c.id, c]));
  const out = [];
  const changed = [];
  for (const x of items) {
    const c = live.get(x.id);
    if (!c) { changed.push({ id: x.id, title: x.title, what: 'gone' }); continue; }
    const fresh = cartItem(c);
    if (fresh.price_usd !== x.price_usd || fresh.is_free !== x.is_free) changed.push({ id: x.id, title: x.title, what: 'price' });
    out.push(fresh);
  }
  return { items: out, changed };
}

/** Total in US dollars (free items count as 0). */
export const cartTotal = (items) => items.reduce((s, x) => s + (x.is_free ? 0 : x.price_usd), 0);
export const paidItems = (items) => items.filter((x) => !x.is_free);
export const freeItems = (items) => items.filter((x) => x.is_free);
