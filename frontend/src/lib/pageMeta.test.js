import { describe, it, expect } from 'vitest';
import { PAGES, fullTitle } from './pageMeta.js';

describe('page titles', () => {
  it('every fixed page has an English and an Arabic title', () => {
    for (const [k, p] of Object.entries(PAGES)) {
      expect(p.en[0], k).toBeTruthy();
      expect(p.ar[0], k).toBeTruthy();
      expect(/[؀-ۿ]/.test(p.ar[0]), `${k} Arabic title`).toBe(true);
    }
  });
  it('private and empty pages are kept out of search engines; public ones are not', () => {
    for (const k of ['account', 'booking', 'gift', 'payment', 'notfound']) expect(PAGES[k].noindex, k).toBe(true);
    for (const k of ['home', 'materials', 'journal', 'terms', 'privacy']) expect(PAGES[k].noindex, k).toBeFalsy();
  });
  it('adds the brand name to inner page titles', () => {
    expect(fullTitle('Journal', 'en')).toBe('Journal | Abir Diab');
    expect(fullTitle('المدونة', 'ar')).toBe('المدونة | عبير دياب');
  });
});
