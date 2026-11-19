import { describe, it, expect } from 'vitest';
import { filterBookings, filterLibrary, whenCounts } from './accountFilter.js';

const now = Date.parse('2026-11-15T12:00:00Z');
const at = (h) => new Date(now + h * 3600e3).toISOString();
const list = [
  { ref: 'AD-AAA', item_title: '1:1 Session', status: 'paid', starts_at: at(48) },
  { ref: 'AD-BBB', item_title: 'Year-End Release Circle', status: 'paid', starts_at: at(-72) },
  { ref: 'AD-CCC', item_title: '1:1 Session', status: 'paid', starts_at: at(5) },
  { ref: 'AD-DDD', item_title: 'Energy Reset Day', status: 'cancelled', starts_at: at(24) },
];

describe('filterBookings', () => {
  it('shows upcoming first (soonest), then past, by default', () => {
    expect(filterBookings(list, {}, { now }).map((b) => b.ref)).toEqual(['AD-CCC', 'AD-AAA', 'AD-DDD', 'AD-BBB']);
  });
  it('filters by upcoming / past', () => {
    expect(filterBookings(list, { when: 'upcoming' }, { now }).map((b) => b.ref)).toEqual(['AD-CCC', 'AD-AAA']);
    expect(filterBookings(list, { when: 'past' }, { now }).map((b) => b.ref)).toEqual(['AD-DDD', 'AD-BBB']);
  });
  it('finds by title, reference or status, ignoring case', () => {
    expect(filterBookings(list, { q: 'release' }, { now }).map((b) => b.ref)).toEqual(['AD-BBB']);
    expect(filterBookings(list, { q: 'ad-ccc' }, { now }).map((b) => b.ref)).toEqual(['AD-CCC']);
    expect(filterBookings(list, { q: 'CANCELLED' }, { now }).map((b) => b.ref)).toEqual(['AD-DDD']);
  });
  it('finds by the date in words', () => {
    expect(filterBookings(list, { q: 'november' }, { now }).length).toBe(4);
    expect(filterBookings(list, { q: 'december' }, { now }).length).toBe(0);
  });
  it('sorts newest or oldest first', () => {
    expect(filterBookings(list, { sort: 'newest' }, { now }).map((b) => b.ref)).toEqual(['AD-AAA', 'AD-DDD', 'AD-CCC', 'AD-BBB']);
    expect(filterBookings(list, { sort: 'oldest' }, { now }).map((b) => b.ref)).toEqual(['AD-BBB', 'AD-CCC', 'AD-DDD', 'AD-AAA']);
  });
  it('handles nothing', () => {
    expect(filterBookings(null, {}, { now })).toEqual([]);
    expect(whenCounts(null, now)).toEqual({ all: 0, upcoming: 0, past: 0 });
  });
});

describe('whenCounts', () => {
  it('counts each chip', () => {
    expect(whenCounts(list, now)).toEqual({ all: 4, upcoming: 2, past: 2 });
  });
});

describe('filterLibrary', () => {
  const view = [
    { c: { id: 1, type: 'Course', title: 'Foundations of Energy Healing' } },
    { c: { id: 2, type: 'Meditation', title: 'Miraculous Monday' } },
    { c: { id: 3, type: 'Manual', title: 'The Pendulum Healing Guide' } },
  ];
  it('filters by type and by words in the title', () => {
    expect(filterLibrary(view, { type: 'Meditation' }).map((x) => x.c.id)).toEqual([2]);
    expect(filterLibrary(view, { q: 'healing' }).map((x) => x.c.id)).toEqual([1, 3]);
    expect(filterLibrary(view, { type: 'Manual', q: 'healing' }).map((x) => x.c.id)).toEqual([3]);
    expect(filterLibrary(view, {}).length).toBe(3);
  });
});
