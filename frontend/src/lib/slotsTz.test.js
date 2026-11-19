import { describe, it, expect } from 'vitest';
import { slotsForViewer, zoneAbbr } from './slotsTz.js';

const map = { '2026-11-17': ['10:00', '23:00'] };

describe('times in the visitor\'s own zone', () => {
  it('keeps the booking zone as it is and says GST', () => {
    const r = slotsForViewer(map, 'Asia/Dubai', 'Asia/Dubai');
    expect(r.days).toEqual(['2026-11-17']);
    expect(r.byDay['2026-11-17'].map((s) => s.label)).toEqual(['10:00 GST', '23:00 GST']);
  });
  it('shifts the hour for a visitor in another zone (Dubai is UTC+4, Cairo UTC+2 in November)', () => {
    const r = slotsForViewer(map, 'Asia/Dubai', 'Africa/Cairo');
    expect(r.byDay['2026-11-17'].map((s) => s.hm)).toEqual(['08:00', '21:00']);
  });
  it('moves a late time onto the visitor\'s next day, but still saves the booking-zone date and time', () => {
    const r = slotsForViewer(map, 'Asia/Dubai', 'Asia/Tokyo');
    expect(r.days).toEqual(['2026-11-17', '2026-11-18']);
    const late = r.byDay['2026-11-18'][0];
    expect(late.hm).toBe('04:00');
    expect([late.date, late.time]).toEqual(['2026-11-17', '23:00']);
  });
  it('names the Gulf zones the usual way', () => {
    expect(zoneAbbr('Asia/Dubai')).toBe('GST');
    expect(zoneAbbr('Asia/Riyadh')).toBe('AST');
  });
});
