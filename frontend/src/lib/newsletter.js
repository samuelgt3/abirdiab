import { supabase } from './supabase.js';

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

/**
 * Adds an email to public.newsletter_subscribers (migration 0004).
 * Returns 'ok' | 'invalid' | 'error'. An address that is already subscribed counts as 'ok'.
 */
export async function subscribe(email, lang) {
  const value = String(email || '').trim().toLowerCase();
  if (!isEmail(value)) return 'invalid';
  if (!supabase) return 'error';
  // plain insert (no .select()): visitors may add a row but can never read the list back
  const { error } = await supabase.from('newsletter_subscribers').insert({ email: value, lang });
  if (!error || error.code === '23505') return 'ok'; // 23505 = already on the list
  console.warn('[newsletter]', error.message);
  return 'error';
}
