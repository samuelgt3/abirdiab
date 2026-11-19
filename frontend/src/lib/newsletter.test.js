import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase.js', () => ({ supabase: null }));
const { isEmail, subscribe } = await import('./newsletter.js');

describe('isEmail', () => {
  it('accepts normal addresses', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('  name.surname@mail.example.com ')).toBe(true);
  });
  it('rejects bad ones', () => {
    for (const bad of ['', 'abc', 'a@b', 'a@b.c', 'a b@c.com', null]) expect(isEmail(bad)).toBe(false);
  });
});

describe('subscribe', () => {
  it('rejects an invalid address before any network call', async () => {
    expect(await subscribe('nope', 'en')).toBe('invalid');
  });
  it('reports an error when the database is not configured', async () => {
    expect(await subscribe('a@b.co', 'en')).toBe('error');
  });
});
