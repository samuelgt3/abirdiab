/**
 * Country-based pricing.
 *
 * All prices are stored in USD. The visitor's country comes from their IP address (our own "geo" function),
 * live USD rates are fetched (open.er-api.com, free, no key) and cached 24 h in localStorage.
 * Everything falls back to USD if a call fails or is blocked. Display only: payments are in USD.
 */

import { supabase } from './supabase.js';

export const OFFERED =['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR'];

const COUNTRY_CURRENCY = {
  US: 'USD', EG: 'EGP', AE: 'AED', SA: 'SAR', KW: 'KWD', QA: 'QAR', BH: 'BHD', OM: 'OMR', JO: 'JOD',
  GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON',
  TR: 'TRY', IQ: 'IQD', LB: 'LBP', LY: 'LYD', TN: 'TND', DZ: 'DZD', MA: 'MAD', SD: 'SDG', YE: 'YER', IL: 'ILS', PS: 'ILS', ET: 'ETB',
  KE: 'KES', NG: 'NGN', ZA: 'ZAR', GH: 'GHS', TZ: 'TZS', UG: 'UGX', IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', ID: 'IDR', MY: 'MYR',
  SG: 'SGD', PH: 'PHP', TH: 'THB', VN: 'VND', JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD', RU: 'RUB', UA: 'UAH', BR: 'BRL', MX: 'MXN',
  AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR',
  FI: 'EUR', GR: 'EUR', CY: 'EUR', MT: 'EUR', LU: 'EUR',
};

export const currencyForCountry = (cc) => COUNTRY_CURRENCY[String(cc || '').toUpperCase()] || 'USD';

/** Round to a "clean" number using a step that grows with the amount (2.5, 35, 450, 2,600 ...). */
export function niceRound(value) {
  if (!value || value <= 0) return 0;
  let step;
  if (value < 10) step = 0.5;
  else if (value < 100) step = 5;
  else if (value < 1000) step = 10;
  else if (value < 10000) step = 50;
  else step = 500;
  return Math.max(step, Number((Math.round(value / step) * step).toFixed(2)));
}

/** usd -> amount in `cur`. 0 stays 0 (free). Unknown rate => USD unchanged. */
export function convert(usd, cur, rates) {
  if (!usd) return 0;
  if (cur === 'USD') return Number(usd);
  const rate = rates && rates[cur];
  if (!rate) return Number(usd);
  return niceRound(usd * rate);
}

export function format(amount, cur, lang) {
  // Arabic pages show prices exactly as English ones do ($7, EUR 7): same symbol, same Latin digits, same order
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  // in Arabic the price is kept as one left-to-right block, so "$7" never flips to "7$"
  const keep = (s) => (lang === 'ar' ? `⁦${s}⁩` : s);
  try {
    return keep(new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      currencyDisplay: 'symbol', // $ € £ for the majors, plain codes (EGP, AED) elsewhere
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount));
  } catch {
    return keep(`${cur} ${amount}`);
  }
}

/** Price label for a USD price. rates may be null (=> USD). */
export function priceLabel(usd, cur, rates, lang) {
  const effective = cur !== 'USD' && !(rates && rates[cur]) ? 'USD' : cur;
  return format(convert(usd, effective, rates), effective, lang);
}

// ---------------------------------------------------------------- network + cache
const RATES_KEY = 'abir_rates_v1';
const CUR_KEY = 'abir_cur';
const DAY = 24 * 60 * 60 * 1000;

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

export const savedCurrency = () => { try { return localStorage.getItem(CUR_KEY); } catch { return null; } };
export const saveCurrency = (c) => { try { localStorage.setItem(CUR_KEY, c); } catch { /* ignore */ } };

async function getJson(url, ms = 5000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Common time zones -> country (used only to pick a starting currency; the visitor can always change it)
const TZ_COUNTRY = {
  'Asia/Dubai': 'AE', 'Asia/Muscat': 'OM', 'Asia/Riyadh': 'SA', 'Asia/Kuwait': 'KW', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH', 'Asia/Baghdad': 'IQ',
  'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Damascus': 'SY', 'Asia/Jerusalem': 'IL', 'Africa/Cairo': 'EG', 'Africa/Tripoli': 'LY', 'Africa/Tunis': 'TN',
  'Africa/Algiers': 'DZ', 'Africa/Casablanca': 'MA', 'Europe/Istanbul': 'TR', 'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT',
  'Europe/Lisbon': 'PT', 'Europe/Athens': 'GR', 'Europe/Helsinki': 'FI', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Asia/Kolkata': 'IN',
};

/** "ar-EG" -> EG; otherwise the country of the device's time zone; otherwise null. Pure and offline. */
export function countryFromLocale(languages = [], timeZone = '') {
  for (const l of languages) {
    const m = /^[a-z]{2,3}[-_]([A-Za-z]{2})\b/.exec(String(l || ''));
    if (m) return m[1].toUpperCase();
  }
  return TZ_COUNTRY[timeZone] || null;
}

const GEO_KEY = 'abir_geo_v1';
const validCountry = (c) => (/^[A-Z]{2}$/.test(String(c || '').toUpperCase()) ? String(c).toUpperCase() : null);

/** The country this device's guess says (language, then time zone). Only the fallback. */
function countryFromDevice() {
  try {
    return countryFromLocale(navigator.languages?.length ? navigator.languages : [navigator.language], Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

/**
 * The visitor's country, from their IP address: our own "geo" function reads the country the network edge worked out from the
 * address (only the two-letter code comes back; the address itself is never stored). Remembered for a week on the device.
 * If that is not available, the device's language / time zone is used instead.
 */
export async function detectCountry() {
  const cached = read(GEO_KEY);
  if (cached?.cc && Date.now() - cached.at < 7 * DAY) return cached.cc;
  let cc = null;
  try {
    if (supabase) {
      const { data } = await Promise.race([supabase.functions.invoke('geo'), new Promise((_, no) => { setTimeout(() => no(new Error('slow')), 4000); })]);
      cc = validCountry(data?.country);
    }
  } catch { /* falls back to the device's guess */ }
  if (cc) { write(GEO_KEY, { at: Date.now(), cc }); return cc; }
  return countryFromDevice();
}

export async function loadRates() {
  const cached = read(RATES_KEY);
  if (cached && Date.now() - cached.at < DAY) return cached.rates;
  try {
    const j = await getJson('https://open.er-api.com/v6/latest/USD');
    if (j.result === 'success' && j.rates) {
      write(RATES_KEY, { at: Date.now(), rates: j.rates });
      return j.rates;
    }
  } catch { /* fall through */ }
  return cached ? cached.rates : null; // stale beats nothing
}
