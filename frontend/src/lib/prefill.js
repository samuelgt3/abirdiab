import { splitName } from './names.js';

/**
 * Signed-in customers: fill the checkout's "Your details" with what the account already knows (name, email, phone, country).
 * Only fills what is still empty, so anything the customer has typed or changed stays as it is.
 * account = { email, name, phone, country }   isCountry(code) says whether the phone-code menu has that country
 */
export function accountPrefill(f, account, isCountry = () => true) {
  const hasName = !!(f.first || f.last);
  const next = { ...f };
  if (!hasName && account.name) Object.assign(next, splitName(account.name), { name: account.name });
  if (!f.email && account.email) next.email = account.email;
  if (!f.phone && account.phone) {
    next.phone = account.phone;
    if (account.country && isCountry(account.country)) next.code = account.country;
  }
  return next;
}

/** A saved draft only brings back what was typed: empty fields never wipe out the account details that were filled in. */
export function mergeDraft(f, draft) {
  const out = { ...f };
  for (const [k, v] of Object.entries(draft || {})) {
    if (v === '' || v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}
