import { describe, it, expect } from 'vitest';
import { bunnyEmbedUrl } from './bunny.js';

describe('bunnyEmbedUrl', () => {
  it('plain link when no token is sent', () => {
    expect(bunnyEmbedUrl('123', 'abc')).toBe('https://iframe.mediadelivery.net/embed/123/abc');
  });
  it('adds the signed token and expiry', () => {
    expect(bunnyEmbedUrl('123', 'abc', 'tok', 1700000000)).toBe('https://iframe.mediadelivery.net/embed/123/abc?token=tok&expires=1700000000');
  });
  it('nothing without a library or a video', () => {
    expect(bunnyEmbedUrl('', 'abc')).toBeNull();
    expect(bunnyEmbedUrl('123', '')).toBeNull();
  });
});
