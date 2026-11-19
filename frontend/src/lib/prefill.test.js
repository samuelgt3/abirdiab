import { describe, it, expect } from 'vitest';
import { accountPrefill, mergeDraft } from './prefill.js';

const blank = { name: '', first: '', middle: '', last: '', code: 'EG', phone: '', email: '', notes: '' };
const account = { email: 'mona@example.com', name: 'Mona Ahmed Hassan', phone: '1012345678', country: 'SA' };
const isCountry = (c) => ['EG', 'SA'].includes(c);

describe('accountPrefill', () => {
  it('fills name (in three parts), email, phone and country for a signed-in customer', () => {
    const f = accountPrefill(blank, account, isCountry);
    expect(f).toMatchObject({ first: 'Mona', middle: 'Ahmed', last: 'Hassan', name: 'Mona Ahmed Hassan', email: 'mona@example.com', phone: '1012345678', code: 'SA' });
  });
  it('never overwrites what the customer typed or changed', () => {
    const typed = { ...blank, first: 'Mo', last: 'H', email: 'other@example.com', phone: '555', code: 'EG' };
    const f = accountPrefill(typed, account, isCountry);
    expect(f).toMatchObject({ first: 'Mo', last: 'H', email: 'other@example.com', phone: '555', code: 'EG' });
  });
  it('copes with a missing name or phone', () => {
    expect(accountPrefill(blank, { email: 'a@b.co' }, isCountry)).toMatchObject({ first: '', email: 'a@b.co', phone: '' });
  });
});

describe('mergeDraft', () => {
  it('brings back typed fields but ignores empty ones', () => {
    const filled = accountPrefill(blank, account, isCountry);
    const draft = { first: '', last: '', email: '', phone: '', notes: 'be gentle', giftMode: '' };
    expect(mergeDraft(filled, draft)).toMatchObject({ first: 'Mona', last: 'Hassan', email: 'mona@example.com', phone: '1012345678', notes: 'be gentle' });
  });
  it('lets a draft change a value the customer had edited before', () => {
    const filled = accountPrefill(blank, account, isCountry);
    expect(mergeDraft(filled, { email: 'edited@example.com' }).email).toBe('edited@example.com');
  });
});
