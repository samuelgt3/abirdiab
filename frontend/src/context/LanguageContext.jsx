import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { EN } from '../i18n/en.js';
import { AR } from '../i18n/ar.js';
import { readString, writeString } from '../api/storage.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => readString('abir_lang', 'en'));

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      writeString('abir_lang', next);
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const isRTL = lang === 'ar';
    const L = isRTL ? AR : EN;
    return {
      lang,
      L,
      isRTL,
      dirAttr: isRTL ? 'rtl' : 'ltr',
      langAttr: isRTL ? 'ar' : 'en',
      bodyFont: isRTL ? 'Almarai, sans-serif' : 'DM Sans, sans-serif',
      headFont: isRTL ? 'Tajawal, sans-serif' : 'Newsreader, serif',
      toggleLang,
    };
  }, [lang, toggleLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
