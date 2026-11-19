import { describe, it, expect } from 'vitest';
import { strongEnough } from './password.js';

describe('new password rule', () => {
  it('needs 8 characters, a letter and a number', () => {
    expect(strongEnough('abcdefgh')).toBe(false);
    expect(strongEnough('12345678')).toBe(false);
    expect(strongEnough('abc12')).toBe(false);
    expect(strongEnough('abcdefg1')).toBe(true);
    expect(strongEnough('كلمةسر123')).toBe(true);
  });
});
