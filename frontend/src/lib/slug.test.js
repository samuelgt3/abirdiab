import { describe, it, expect } from 'vitest';
import fallback from '../data/fallback.json';
import { findBySlug, slugify } from './slug.js';

describe('slugify', () => {
  it('makes clean URL ids', () => {
    expect(slugify('Why “Normal” Isn’t the Goal')).toBe('why-normal-isnt-the-goal');
    expect(slugify('Rana’s Journey Back to Herself')).toBe('ranas-journey-back-to-herself');
    expect(slugify('  ')).toBe('item');
  });
  it('gives every bundled course and post a unique slug that finds it again', () => {
    for (const list of [fallback.courses, fallback.journal_posts]) {
      const slugs = list.map((x) => slugify(x.title));
      expect(new Set(slugs).size).toBe(slugs.length);
      list.forEach((x) => expect(findBySlug(list, slugify(x.title))).toBe(x));
    }
  });
});
