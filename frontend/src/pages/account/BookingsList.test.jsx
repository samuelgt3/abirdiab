import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderToString } from 'react-dom/server';
import pageCopy from '../../content/accountPage.json';

vi.mock('../../components/checkout/CheckoutContext.jsx', () => ({ useCheckout: () => ({ bookSession: () => {} }) }));
vi.mock('../../components/BookingCard.jsx', () => ({ default: ({ b }) => <article data-ref={b.ref}>{b.item_title}</article> }));
const { default: BookingsList } = await import('./BookingsList.jsx');

const now = Date.now();
const at = (h) => new Date(now + h * 3600e3).toISOString();
const orders = [
  { ref: 'AD-S1', kind: 'session', item_title: '1:1 Session', status: 'paid', starts_at: at(30) },
  { ref: 'AD-S2', kind: 'session', item_title: '1:1 Session', status: 'paid', starts_at: at(-90) },
  { ref: 'AD-W1', kind: 'workshop', item_title: 'Year-End Release Circle', status: 'paid', starts_at: at(100) },
];
const html = (kind, list = orders, lang = 'en') => renderToString(<MemoryRouter><BookingsList p={pageCopy[lang]} lang={lang} kind={kind} orders={list} /></MemoryRouter>);

describe('1:1 Session and Workshops tabs', () => {
  it('the 1:1 Session tab lists only sessions, with filter buttons, a search box and a sort menu', () => {
    const h = html('session');
    expect(h).toContain('data-ref="AD-S1"');
    expect(h).toContain('data-ref="AD-S2"');
    expect(h).not.toContain('AD-W1');
    expect(h).toContain('Upcoming');
    expect(h).toContain('Past');
    expect(h).toContain('type="search"');
    expect(h).toContain('Sort');
  });
  it('the Workshops tab lists only workshops', () => {
    const h = html('workshop');
    expect(h).toContain('data-ref="AD-W1"');
    expect(h).not.toContain('AD-S1');
  });
  it('shows a friendly empty state when there are none of that kind', () => {
    expect(html('workshop', orders.filter((o) => o.kind === 'session'))).toContain('No workshops yet');
    expect(html('session', [])).toContain('No 1:1 sessions yet');
  });
  it('works in Arabic', () => {
    const h = html('session', orders, 'ar');
    expect(h).toContain('القادمة');
    expect(h).toContain('type="search"');
  });
});
