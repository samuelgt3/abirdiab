import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderToString } from 'react-dom/server';

vi.mock('../hooks/SiteContext.jsx', () => ({ useSite: () => ({ lang: 'en' }) }));
const { default: BookingCard } = await import('./BookingCard.jsx');

const booking = (minutesFromNow) => ({
  ref: 'AD-TEST00001', kind: 'session', item_title: '1:1 Session', paid: true, released: true, join_url: 'https://meet.jit.si/AbirDiab-test',
  starts_at: new Date(Date.now() + minutesFromNow * 60000).toISOString(), session_timezone: 'Asia/Dubai', mine: true,
});
const html = (b) => renderToString(<MemoryRouter><BookingCard b={b} /></MemoryRouter>);

describe('join button', () => {
  it('is locked, with an explanation, more than 30 minutes before the start', () => {
    const h = html(booking(180));
    expect(h).toContain('Not time to join yet');
    expect(h).toMatch(/<button[^>]*disabled[^>]*>Join/);
    expect(h).not.toMatch(/<a [^>]*href="https:\/\/meet\.jit\.si[^>]*>Join/);
  });
  it('is a working link from 30 minutes before the start', () => {
    const h = html(booking(20));
    expect(h).not.toContain('Not time to join yet');
    expect(h).toMatch(/<a [^>]*href="https:\/\/meet\.jit\.si\/AbirDiab-test"[^>]*>Join/);
  });
  it('is closed, with a note, more than 6 hours after the start', () => {
    const h = html(booking(-400));
    expect(h).toContain('has ended');
    expect(h).toMatch(/<button[^>]*disabled[^>]*>Join/);
    expect(h).not.toMatch(/<a [^>]*href="https:\/\/meet\.jit\.si[^>]*>Join/);
  });
});
