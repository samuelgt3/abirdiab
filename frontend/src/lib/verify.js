import { supabase } from './supabase.js';

/** Digits only, with the country code and without the leading trunk 0 of the national number: "+20" + "010 1234 5678" -> "201012345678". */
export const e164Digits = (dial, phone) => `${String(dial || '').replace(/\D/g, '')}${String(phone || '').replace(/\D/g, '').replace(/^0+/, '')}`;

async function call(fn, body) {
  if (!supabase) return { error: 'not_configured' };
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (!error) return data || {};
  let code = 'send_failed';
  try { code = (await error.context?.json?.())?.error || code; } catch { /* body not JSON */ }
  return { error: code };
}

/** Asks for a one-time code. kind: 'email' | 'phone'. channel (phone only): 'sms' | 'whatsapp'. Resolves { sent } or { error }. */
export const sendCode = ({ kind, target, channel, lang }) => call('send-code', { kind, target, channel, lang });

/** Creates the account in the middle of checkout, after the email (and phone) codes were confirmed. Resolves { created } or { error }. */
export const verifiedSignup = (body) => call('signup-verified', body);

/** Checks the code. Resolves { verified, id } or { error }. `id` goes into the order. */
export const checkCode = ({ kind, target, code }) => call('check-code', { kind, target, code });
