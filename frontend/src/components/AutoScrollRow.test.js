import { describe, it, expect } from 'vitest';
import { loopStep, wrapPos } from './AutoScrollRow.jsx';

const set = 1000;

describe('loopStep (the endless slow drift)', () => {
  it('moves forward in proportion to time and speed', () => {
    expect(loopStep(1100, 1000, { set, speed: 26, cur: 1100 })).toBeCloseTo(1126, 5);
    expect(loopStep(1100, 500, { set, speed: 26, cur: 1100 })).toBeCloseTo(1113, 5);
  });
  it('is slow: a 16 ms frame moves well under one pixel', () => {
    expect(loopStep(1000, 16, { set, speed: 26, cur: 1000 }) - 1000).toBeLessThan(0.5);
  });
  it('carries on from where the visitor scrolled it', () => {
    expect(loopStep(1100, 1000, { set, speed: 26, cur: 1500 })).toBeCloseTo(1526, 5);
  });
  it('goes round: past the end of the middle copy it continues from the start of it, never rewinding to 0', () => {
    const next = loopStep(1999, 1000, { set, speed: 26, cur: 1999 });
    expect(next).toBeCloseTo(1025, 5);
    expect(next).toBeGreaterThanOrEqual(set);
    expect(next).toBeLessThan(2 * set);
  });
  it('keeps moving the same direction forever', () => {
    let pos = 1990;
    const seen = [];
    for (let i = 0; i < 6; i += 1) { pos = loopStep(pos, 1000, { set, speed: 26, cur: pos }); seen.push(pos); }
    expect(seen.every((p) => p >= set && p < 2 * set)).toBe(true);
  });
});

describe('wrapPos (manual scrolling)', () => {
  it('jumps by one copy so the picture stays identical', () => {
    expect(wrapPos(2100, set)).toBe(1100);
    expect(wrapPos(50, set)).toBe(1050);
    expect(wrapPos(1500, set)).toBe(1500);
  });
});
