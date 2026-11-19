import { describe, it, expect } from 'vitest';
import { addItem, cartItem, cartTotal, freeItems, paidItems, removeItem } from './cart.js';

const a = { id: 'a', title: 'Reiki', price_usd: '49.00', type: 'Video' };
const b = { id: 'b', title: 'Grounding', price_usd: 7, type: 'Audio' };
const f = { id: 'f', title: 'Free guide', price_usd: 0, is_free: true, type: 'PDF' };

describe('cart', () => {
  it('adds a course once', () => {
    let items = addItem([], a);
    items = addItem(items, a);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'a', price_usd: 49, is_free: false });
  });
  it('removes by id', () => {
    expect(removeItem(addItem(addItem([], a), b), 'a').map((x) => x.id)).toEqual(['b']);
  });
  it('totals only the paid items, in US dollars', () => {
    const items = [a, b, f].reduce(addItem, []);
    expect(cartTotal(items)).toBe(56);
    expect(paidItems(items).map((x) => x.id)).toEqual(['a', 'b']);
    expect(freeItems(items).map((x) => x.id)).toEqual(['f']);
  });
  it('treats a zero price as free', () => {
    expect(cartItem({ id: 'z', title: 'Z', price_usd: 0 }).is_free).toBe(true);
  });
});

import { syncCart } from './cart.js';

describe('cart follows the live list', () => {
  it('updates prices and drops items that are gone', () => {
    const saved = [addItem([], a)[0], addItem([], b)[0]];
    const live = [{ ...a, price_usd: 59 }];
    const r = syncCart(saved, live);
    expect(r.items.map((x) => [x.id, x.price_usd])).toEqual([['a', 59]]);
    expect(r.changed.map((c) => c.what).sort()).toEqual(['gone', 'price']);
  });
  it('changes nothing when nothing moved', () => {
    const saved = [addItem([], a)[0]];
    expect(syncCart(saved, [a]).changed).toEqual([]);
  });
});
