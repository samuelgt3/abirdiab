/** Small safe-localStorage helpers. Every mock API module below reads/writes
 * through here today; when a real backend exists, each api/* module swaps
 * its body for a `client.request(...)` call and these keys mostly disappear
 * (a few, like the language preference, are fine to keep client-side only). */

export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/availability errors, matching original best-effort persistence */
  }
}

export function readString(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
