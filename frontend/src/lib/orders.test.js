import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase.js', () => ({ supabase: null }));
const {
  cleanPhone, validateDetails, todayIn, addDays, dateAllowed, timesFor, zonedToUtc, DEFAULT_SETTINGS, createOrder, releaseAt, RELEASE_BEFORE_MS,
} = await import('./orders.js');

describe('phone + details validation', () => {
  it('cleans phone input', () => {
    expect(cleanPhone('+20 (10) 8a07-3')).toBe('20 (10) 807-3');
    expect(cleanPhone('1234567890123456')).toBe('123456789012');
  });
  it('flags each bad field', () => {
    expect(validateDetails({ name: 'A', phone: '123', email: 'x' })).toEqual({ name: 'name', phone: 'phoneLen', email: 'email' });
    expect(validateDetails({ name: 'Rana', phone: '', email: '' })).toEqual({ phone: 'phoneReq', email: 'emailReq' });
    expect(validateDetails({ name: 'Rana', phone: '', email: 'r@x.com' }, { needPhone: false })).toEqual({});
    expect(validateDetails({ name: 'Rana', phone: '1080736170', email: 'r@x.com' })).toEqual({});
  });
  it('checks the gift recipient', () => {
    expect(validateDetails({ name: 'Rana', phone: '1080736170', email: 'r@x.com', giftName: '', giftEmail: 'no' }, { gift: true }))
      .toEqual({ giftName: 'name', giftEmail: 'email' });
  });
});

describe('booking dates', () => {
  const now = new Date('2026-11-14T10:30:00Z'); // 14:30 in Dubai
  const s = { ...DEFAULT_SETTINGS, booking_days_ahead: 10, booking_weekdays: [1, 2, 3, 4, 5, 6] }; // no Sundays
  it('knows today in a time zone', () => {
    expect(todayIn('Asia/Dubai', now)).toBe('2026-11-14');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
  it('allows only the window and weekdays', () => {
    expect(dateAllowed('2026-11-13', s, now)).toBe(false); // past
    expect(dateAllowed('2026-11-14', s, now)).toBe(true); // Saturday, today
    expect(dateAllowed('2026-11-15', s, now)).toBe(false); // Sunday
    expect(dateAllowed('2026-11-25', s, now)).toBe(false); // beyond 10 days
    expect(dateAllowed('nope', s, now)).toBe(false);
  });
  it('hides times already passed today', () => {
    expect(timesFor('2026-11-14', s, now)).toEqual(['16:00', '18:00', '20:00']);
    expect(timesFor('2026-11-16', s, now)).toEqual(DEFAULT_SETTINGS.booking_times);
  });
  it('converts wall-clock time to UTC', () => {
    expect(zonedToUtc('2026-12-12', '20:00', 'Asia/Dubai').toISOString()).toBe('2026-12-12T16:00:00.000Z');
  });
});

describe('createOrder without a database', () => {
  it('fails gracefully', async () => {
    expect(await createOrder({ kind: 'session' })).toEqual({ error: 'offline' });
  });
});

describe('joining-link release', () => {
  it('opens 2 hours before the start', () => {
    expect(RELEASE_BEFORE_MS).toBe(2 * 60 * 60 * 1000);
    expect(releaseAt('2026-12-12T16:00:00Z').toISOString()).toBe('2026-12-12T14:00:00.000Z');
    expect(releaseAt(null)).toBeNull();
  });
});

import { joinOpensAt, joinState } from './orders.js';

describe('join button timing', () => {
  const start = '2026-11-20T10:00:00Z';
  it('is locked until 30 minutes before the start', () => {
    expect(joinState(start, Date.parse('2026-11-20T09:29:00Z'))).toBe('early');
    expect(joinState(start, Date.parse('2026-11-20T09:30:00Z'))).toBe('open');
    expect(joinState(start, Date.parse('2026-11-20T10:30:00Z'))).toBe('open');
  });
  it('stops working 6 hours after the start', () => {
    expect(joinState(start, Date.parse('2026-11-20T15:59:00Z'))).toBe('open');
    expect(joinState(start, Date.parse('2026-11-20T16:01:00Z'))).toBe('ended');
  });
  it('knows when it opens, and does not lock when the start is unknown', () => {
    expect(joinOpensAt(start).toISOString()).toBe('2026-11-20T09:30:00.000Z');
    expect(joinState(null)).toBe('open');
  });
});

import { newAccessKey, accessKeyFor } from './orders.js';

describe('paying without an account', () => {
  it('makes a long, different private key each time', () => {
    const a = newAccessKey(); const b = newAccessKey();
    expect(a).toMatch(/^[0-9a-f]{48}$/);
    expect(a).not.toBe(b);
  });
  it('knows no key for a booking made elsewhere', () => {
    expect(accessKeyFor('AD-ABCDEF123')).toBeNull();
  });
});
