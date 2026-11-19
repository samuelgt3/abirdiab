import { describe, it, expect } from 'vitest';
import { WATCH_VIDEOS, watchSrc } from './links.js';

describe('Watch & Listen videos', () => {
  it('are the two chosen videos with their play ranges', () => {
    expect(WATCH_VIDEOS).toEqual([
      { id: 'BEyRjrJnG9M', start: 0, end: 80 },
      { id: 'wJ6uagpLRyw', start: 5, end: 60 },
    ]);
  });
  it('build an embed that starts and stops at those seconds', () => {
    expect(watchSrc(WATCH_VIDEOS[0])).toContain('/embed/BEyRjrJnG9M?autoplay=1&start=0&end=80');
    expect(watchSrc(WATCH_VIDEOS[1])).toContain('/embed/wJ6uagpLRyw?autoplay=1&start=5&end=60');
  });
});
