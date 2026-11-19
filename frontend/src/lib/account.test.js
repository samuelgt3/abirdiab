import { describe, it, expect } from 'vitest';
import copy from '../content/accountPage.json';
import { countdownText, isUpcoming, splitBookings } from './account.js';

const now = Date.parse('2026-11-15T12:00:00Z');
const at = (h) => new Date(now + h * 3600e3).toISOString();

describe('splitBookings', () => {
  const list = [
    { ref: 'A', status: 'paid', starts_at: at(48) },
    { ref: 'B', status: 'paid', starts_at: at(-72) },
    { ref: 'C', status: 'awaiting_payment', starts_at: at(5) },
    { ref: 'D', status: 'cancelled', starts_at: at(24) },
    { ref: 'E', status: 'paid', starts_at: at(-1) }, // started an hour ago: still "now"
    { ref: 'F', status: 'paid', starts_at: null },
  ];
  it('puts what is ahead (or happening now) in upcoming, soonest first', () => {
    expect(splitBookings(list, now).upcoming.map((b) => b.ref)).toEqual(['E', 'C', 'A']);
  });
  it('puts finished, cancelled and undated ones in past, latest first (undated last)', () => {
    expect(splitBookings(list, now).past.map((b) => b.ref)).toEqual(['D', 'B', 'F']);
  });
  it('handles nothing', () => {
    expect(splitBookings(null, now)).toEqual({ upcoming: [], past: [] });
    expect(isUpcoming({ status: 'paid' }, now)).toBe(false);
  });
});

describe('countdownText', () => {
  const inHours = (h) => new Date(now + h * 3600e3).toISOString();
  it('English singular and plural', () => {
    expect(countdownText(inHours(26), copy.en, now)).toBe('in 1 day');
    expect(countdownText(inHours(72), copy.en, now)).toBe('in 3 days');
    expect(countdownText(inHours(1.2), copy.en, now)).toBe('in 1 hour');
    expect(countdownText(inHours(0.25), copy.en, now)).toBe('in 15 minutes');
  });
  it('Arabic: singular for 1 and 11+, dual for 2, plural for 3 to 10', () => {
    expect(countdownText(inHours(26), copy.ar, now)).toBe('بعد 1 يوم');
    expect(countdownText(inHours(49), copy.ar, now)).toBe('بعد يومين');
    expect(countdownText(inHours(24 * 5 + 1), copy.ar, now)).toBe('بعد 5 أيام');
    expect(countdownText(inHours(19), copy.ar, now)).toBe('بعد 19 ساعة');
    expect(countdownText(inHours(3), copy.ar, now)).toContain('ساعات');
  });
  it('says starting now when the time has come', () => {
    expect(countdownText(inHours(-1), copy.en, now)).toBe('starting now');
  });
});
