import { describe, it, expect } from 'vitest';
import { niceRound, convert, currencyForCountry, format, priceLabel } from './pricing.js';

describe('niceRound', () => {
  it('rounds to clean numbers', () => {
    expect(niceRound(450)).toBe(450);
    expect(niceRound(446)).toBe(450);
    expect(niceRound(33.2)).toBe(35);
    expect(niceRound(0)).toBe(0);
    expect(niceRound(2618)).toBe(2600);
    expect(niceRound(2.74)).toBe(2.5);
  });
});

describe('convert', () => {
  const rates = { EGP: 50, AED: 3.67 };
  it('keeps USD and free prices', () => {
    expect(convert(9, 'USD', rates)).toBe(9);
    expect(convert(0, 'EGP', rates)).toBe(0);
  });
  it('converts with a clean result', () => {
    expect(convert(9, 'EGP', rates)).toBe(450);
  });
  it('falls back to USD when the rate is missing', () => {
    expect(convert(9, 'EGP', null)).toBe(9);
    expect(priceLabel(9, 'EGP', null, 'en')).toBe('$9');
  });
});

describe('currencyForCountry', () => {
  it('maps countries and defaults to USD', () => {
    expect(currencyForCountry('eg')).toBe('EGP');
    expect(currencyForCountry('AE')).toBe('AED');
    expect(currencyForCountry('FR')).toBe('EUR');
    expect(currencyForCountry('ZZ')).toBe('USD');
    expect(currencyForCountry(null)).toBe('USD');
  });
});

describe('format', () => {
  it('uses Western digits in Arabic', () => {
    expect(format(450, 'EGP', 'ar')).toMatch(/450/);
  });
});

import { countryFromLocale } from './pricing.js';

describe('country from the device (no outside lookup)', () => {
  it('uses the region of the language first, then the time zone', () => {
    expect(countryFromLocale(['ar-EG', 'en'], 'Asia/Dubai')).toBe('EG');
    expect(countryFromLocale(['en'], 'Asia/Dubai')).toBe('AE');
    expect(countryFromLocale(['en'], 'Antarctica/Troll')).toBe(null);
    expect(countryFromLocale([], 'Africa/Cairo')).toBe('EG');
  });
});
