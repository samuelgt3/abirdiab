import { describe, it, expect } from 'vitest';
import { distance, suggestEmail } from './emailTypos.js';

describe('suggestEmail', () => {
  it('fixes the common Gmail slips', () => {
    expect(suggestEmail('layla@gmial.com')).toBe('layla@gmail.com');
    expect(suggestEmail('layla@gmail.con')).toBe('layla@gmail.com');
    expect(suggestEmail('Layla@Gmail.co')).toBe('layla@gmail.com');
    expect(suggestEmail('layla@gnail.com')).toBe('layla@gmail.com');
  });
  it('fixes other big providers', () => {
    expect(suggestEmail('a@hotmial.com')).toBe('a@hotmail.com');
    expect(suggestEmail('a@outlok.com')).toBe('a@outlook.com');
    expect(suggestEmail('a@yahooo.com')).toBe('a@yahoo.com');
  });
  it('leaves correct and unrelated addresses alone', () => {
    expect(suggestEmail('layla@gmail.com')).toBeNull();
    expect(suggestEmail('info@abirdiab.com')).toBeNull();
    expect(suggestEmail('me@mycompany.eg')).toBeNull();
    expect(suggestEmail('a@b.co')).toBeNull();
  });
  it('ignores things that are not addresses yet', () => {
    expect(suggestEmail('')).toBeNull();
    expect(suggestEmail('layla')).toBeNull();
    expect(suggestEmail('layla@')).toBeNull();
  });
});

describe('distance', () => {
  it('counts a swap of neighbours as one slip', () => {
    expect(distance('gmial.com', 'gmail.com')).toBe(1);
    expect(distance('abc', 'abc')).toBe(0);
  });
});
