/** "Mona Ahmed Hassan" -> { first: 'Mona', middle: 'Ahmed', last: 'Hassan' }. One word is a first name; two words are first + last. */
export function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', middle: '', last: '' };
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}

/** The three fields back into one full name (empty ones are skipped). */
export const joinName = (first, middle, last) => [first, middle, last].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
