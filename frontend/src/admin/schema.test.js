import { describe, it, expect } from 'vitest';
import { packToText, textToPack } from './schema.js';

describe('pack contents round trip', () => {
  const items = [
    { kind: 'a', title: 'Full session', length: '22 min', description: 'Start to finish', title_ar: 'الجلسة', length_ar: '22 دقيقة', description_ar: 'كاملة' },
    { kind: 'p', title: 'Guide', length: '4 pages', description: 'A | B', title_ar: 'دليل', length_ar: '4 صفحات', description_ar: 'ب' },
  ];
  it('survives text and back', () => {
    const t = packToText(items);
    expect(textToPack(t.en, t.ar)).toEqual(items);
  });
  it('rejects a bad kind with a line number', () => {
    expect(() => textToPack('x | Title | 1 min | d', '')).toThrow(/line 1/);
  });
  it('rejects a missing title', () => {
    expect(() => textToPack('a |  | 1 min | d', '')).toThrow(/title/);
  });
  it('handles empty input', () => {
    expect(textToPack('', '')).toEqual([]);
    expect(packToText(null)).toEqual({ en: '', ar: '' });
  });
});
