/**
 * "Did you mean …?" for mistyped email addresses (gmial.com, gmail.con, hotmial.com …).
 * Only suggests when the domain is a near miss of a well-known one, so real company addresses are never nagged.
 */
const DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.co.uk',
  'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'zoho.com',
];
// whole-domain slips people make often
const KNOWN_WRONG = {
  'gmai.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.comm': 'gmail.com',
  'gmail.vom': 'gmail.com', 'gmail.cim': 'gmail.com', 'gmail.coom': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.cpm': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotnail.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com',
};

/** Edit distance (insert / delete / replace / swap of neighbours), small strings only. */
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Returns a corrected full address, or null when the address looks fine (or is not a near miss of a common provider). */
export function suggestEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (DOMAINS.includes(domain)) return null;
  if (KNOWN_WRONG[domain]) return `${local}@${KNOWN_WRONG[domain]}`;
  let best = null;
  let bestD = 3;
  for (const d of DOMAINS) {
    const dist = distance(domain, d);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  // one slip, on a domain long enough that one slip is meaningful
  return best && bestD === 1 && domain.length >= 8 ? `${local}@${best}` : null;
}
