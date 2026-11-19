import { describe, it, expect } from 'vitest';
import { groupSlots } from './orders.js';

describe('groupSlots', () => {
  it('groups the posted times by day, earliest first', () => {
    const rows = [
      { date: '2026-11-21', time: '12:00' }, { date: '2026-11-20', time: '14:00' }, { date: '2026-11-20', time: '10:00' },
    ];
    expect(groupSlots(rows)).toEqual({ '2026-11-20': ['10:00', '14:00'], '2026-11-21': ['12:00'] });
  });
  it('handles nothing posted', () => {
    expect(groupSlots(null)).toEqual({});
    expect(groupSlots([])).toEqual({});
  });
});
