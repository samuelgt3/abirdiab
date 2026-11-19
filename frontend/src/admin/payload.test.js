import { describe, it, expect } from 'vitest';
import { SECTIONS } from './schema.js';
import { rowToValues, valuesToPayload, toLocalInput } from './payload.js';

const fields = SECTIONS.courses.fields;

describe('valuesToPayload', () => {
  const base = rowToValues(fields, { title: 'Hello', type: 'Audio', price_usd: 9, published: true, what_you_get: ['a', 'b'] });
  it('turns form values into a clean payload', () => {
    const { payload, error } = valuesToPayload(fields, base);
    expect(error).toBeUndefined();
    expect(payload.title).toBe('Hello');
    expect(payload.price_usd).toBe(9);
    expect(payload.what_you_get).toEqual(['a', 'b']);
    expect(payload.title_ar).toBeNull();
    expect(payload.published).toBe(true);
  });
  it('requires the title', () => {
    expect(valuesToPayload(fields, { ...base, title: '  ' }).error).toMatch(/Title/);
  });
  it('rejects a non-number price', () => {
    expect(valuesToPayload(fields, { ...base, price_usd: 'abc' }).error).toMatch(/number/);
  });
  it('reports a bad pack line', () => {
    expect(valuesToPayload(fields, { ...base, pack_items: 'zzz' }).error).toMatch(/Pack line 1/);
  });
});

describe('toLocalInput', () => {
  it('handles empty and invalid values', () => {
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput('nope')).toBe('');
    expect(toLocalInput('2026-12-12T16:00:00Z')).toMatch(/^2026-12-12T\d\d:\d\d$/);
  });
});
