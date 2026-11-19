import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../content/en.json';
import ar from '../content/ar.json';
import kinds from '../content/kinds.json';
import ui from '../content/ui.json';
import { loadContent, pick, upcoming } from '../lib/content.js';
import {
  convert, currencyForCountry, detectCountry, loadRates, priceLabel, saveCurrency, savedCurrency,
} from '../lib/pricing.js';

const Ctx = createContext(null);
export const useSite = () => useContext(Ctx);

const readLang = () => {
  try {
    const s = localStorage.getItem('abir_lang');
    if (s === 'ar' || s === 'en') return s;
  } catch { /* ignore */ }
  return typeof navigator !== 'undefined' && /^ar/i.test(navigator.language || '') ? 'ar' : 'en';
};

export function SiteProvider({ children }) {
  const [lang, setLang] = useState(readLang);
  const [content, setContent] = useState(null);
  const [source, setSource] = useState('loading');
  const [rates, setRates] = useState(null);
  const [currency, setCurrencyState] = useState(savedCurrency() || 'USD');
  const [country, setCountry] = useState(null);

  // language -> <html dir lang>
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('abir_lang', lang); } catch { /* ignore */ }
  }, [lang]);

  // content
  useEffect(() => {
    let alive = true;
    loadContent().then(({ data, source: s }) => {
      if (!alive) return;
      setContent(data);
      setSource(s);
    });
    return () => { alive = false; };
  }, []);

  // country + rates (never blocks the page; falls back to USD)
  useEffect(() => {
    let alive = true;
    (async () => {
      const [cc, r] = await Promise.all([detectCountry(), loadRates()]);
      if (!alive) return;
      setRates(r);
      setCountry(cc);
      if (!savedCurrency() && cc) setCurrencyState(currencyForCountry(cc));
    })();
    return () => { alive = false; };
  }, []);

  const setCurrency = useCallback((c) => { setCurrencyState(c); saveCurrency(c); }, []);
  const price = useCallback((usd) => priceLabel(usd, currency, rates, lang), [currency, rates, lang]);

  const value = useMemo(() => {
    const t = lang === 'ar' ? ar : en;
    const effectiveCurrency = currency !== 'USD' && !(rates && rates[currency]) ? 'USD' : currency;
    return {
      lang, setLang, t, u: ui[lang], isRTL: lang === 'ar',
      kindLabel: (type) => kinds[lang][type] || type,
      content, source, country,
      currency: effectiveCurrency, setCurrency, price, ratesReady: !!rates,
      /** the currency of the visitor's own country (always kept in the currency menu) */
      homeCurrency: currencyForCountry(country),
      /** every currency we have a live rate for (the currency menu lists them all) */
      currencyCodes: (() => {
        let valid = null;
        try { valid = new Set(Intl.supportedValuesOf('currency')); } catch { /* older browsers: trust the rates */ }
        return Object.keys(rates || {}).filter((c) => /^[A-Z]{3}$/.test(c) && (!valid || valid.has(c)));
      })(),
      /** numeric amount in the shown currency (for order records) */
      priceValue: (usd) => convert(usd, effectiveCurrency, rates),
      /** live USD -> currency rate, or null when unknown */
      rateFor: (cur) => (cur === 'USD' ? 1 : (rates && rates[cur]) || null),
      pick: (row, f) => pick(row, f, lang),
      workshops: content ? upcoming(content.workshops) : [],
    };
  }, [lang, content, source, country, currency, rates, price, setCurrency]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
