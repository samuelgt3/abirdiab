import fallback from '../data/fallback.json';
import { supabase } from './supabase.js';

const TABLES = ['testimonials', 'courses', 'workshops', 'journal_posts', 'meditation_samples'];

/** Localised field: Arabic twin when lang is 'ar' and it is filled in, else English. */
export const pick = (row, field, lang) => (lang === 'ar' && row[`${field}_ar`]) || row[field] || '';

/** Image/audio URLs: absolute (Supabase storage) or a bundled path like "images/x.jpg". */
export const assetUrl = (u) => {
  if (!u) return '';
  if (/^(https?:)?\/\//.test(u) || u.startsWith('data:')) return u;
  return `${import.meta.env.BASE_URL}${u.replace(/^\//, '')}`;
};

export const isPast = (w, now = Date.now()) => !!w.starts_at && new Date(w.starts_at).getTime() < now;

/** Past workshops are hidden automatically (no manual clean-up needed). */
export const upcoming = (list, now = Date.now()) => list.filter((w) => !isPast(w, now));

/**
 * Loads published content from Supabase. On any failure (no env vars, offline, empty table)
 * the bundled starter content is used so the site never renders blank.
 * Returns { data, source: 'database' | 'fallback' }.
 */
export async function loadContent() {
  if (!supabase) return { data: fallback, source: 'fallback' };
  try {
    const results = await Promise.all(
      TABLES.map((t) =>
        supabase.from(t).select('*').eq('published', true).order('sort_order', { ascending: true }),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed) throw failed.error;
    const data = {};
    TABLES.forEach((t, i) => {
      data[t] = results[i].data;
    });
    // seats left as visitors see them (1 shown per 5 real seats); a failure here just hides the counter
    const seatsRes = await supabase.rpc('workshop_seats');
    const seats = seatsRes.error ? {} : seatsRes.data || {};
    data.workshops = data.workshops.map((w) => ({ ...w, seats_shown: seats[w.id]?.shown ?? null, sold_out: !!seats[w.id]?.sold_out }));
    // pack lists: before migration 0002 the columns do not exist -> match bundled packs by title
    const packByTitle = Object.fromEntries(fallback.courses.map((c) => [c.title, c]));
    data.courses = data.courses.map((c) => {
      if (Array.isArray(c.pack_items) && c.pack_items.length) return c;
      const fb = packByTitle[c.title];
      return fb ? { ...c, pack_items: fb.pack_items, has_teaser: c.has_teaser ?? fb.has_teaser } : c;
    });
    return { data, source: 'database' };
  } catch (err) {
    console.warn('[content] database unavailable, using bundled content:', err?.message || err);
    return { data: fallback, source: 'fallback' };
  }
}
