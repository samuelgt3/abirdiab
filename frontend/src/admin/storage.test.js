import { describe, it, expect } from 'vitest';
import { mediaPath } from './storage.js';

const base = 'https://abc.supabase.co/storage/v1/object/public/media/';

describe('mediaPath', () => {
  it('returns the path of a file uploaded through the admin', () => {
    expect(mediaPath(`${base}meditations/1794-sample.wav`)).toBe('meditations/1794-sample.wav');
    expect(mediaPath(`${base}courses/a%20b.jpg?x=1`)).toBe('courses/a b.jpg');
  });
  it('leaves links that are not ours alone', () => {
    expect(mediaPath('https://example.com/song.mp3')).toBeNull();
    expect(mediaPath('images/hero.jpg')).toBeNull();
    expect(mediaPath('')).toBeNull();
    expect(mediaPath(null)).toBeNull();
  });
  it('refuses odd paths', () => {
    expect(mediaPath(`${base}../secret`)).toBeNull();
  });
});
