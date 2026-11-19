import { supabase } from '../lib/supabase.js';

const MARKER = '/storage/v1/object/public/media/';

/** The object path inside the public "media" bucket for a public URL, or null when the URL is not one of ours (pasted links stay untouched). */
export function mediaPath(url) {
  const s = String(url || '');
  const i = s.indexOf(MARKER);
  if (i < 0) return null;
  const path = decodeURIComponent(s.slice(i + MARKER.length).split('?')[0]);
  return path && !path.includes('..') ? path : null;
}

/** Deletes uploaded files from storage. Only URLs that point into our media bucket are removed. Resolves the number removed. */
export async function removeMedia(urls) {
  const paths = [...new Set((urls || []).map(mediaPath).filter(Boolean))];
  if (!paths.length || !supabase) return 0;
  const { error } = await supabase.storage.from('media').remove(paths);
  if (error) { console.warn('[storage] could not remove', error.message); return 0; }
  return paths.length;
}
