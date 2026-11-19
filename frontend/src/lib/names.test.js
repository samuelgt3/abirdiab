import { describe, it, expect } from 'vitest';
import { joinName, splitName } from './names.js';

describe('names in three parts', () => {
  it('splits a full name', () => {
    expect(splitName('Mona Ahmed Hassan')).toEqual({ first: 'Mona', middle: 'Ahmed', last: 'Hassan' });
    expect(splitName('Mona Hassan')).toEqual({ first: 'Mona', middle: '', last: 'Hassan' });
    expect(splitName('Mona')).toEqual({ first: 'Mona', middle: '', last: '' });
    expect(splitName('  ')).toEqual({ first: '', middle: '', last: '' });
    expect(splitName('A B C D')).toEqual({ first: 'A', middle: 'B C', last: 'D' });
  });
  it('joins the parts and skips empty ones', () => {
    expect(joinName(' Mona ', '', 'Hassan')).toBe('Mona Hassan');
    expect(joinName('Mona', 'Ahmed', 'Hassan')).toBe('Mona Ahmed Hassan');
  });
});
