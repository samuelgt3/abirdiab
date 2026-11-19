import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import en from '../content/en.json';

const site = { t: en, u: {}, lang: 'en', pick: (r, f) => r[f], price: (n) => `$${n}`, workshops: [], content: {} };
vi.mock('../hooks/SiteContext.jsx', () => ({ useSite: () => site }));
vi.mock('./checkout/CheckoutContext.jsx', () => ({ useCheckout: () => ({ bookWorkshop: () => {} }), useChargeName: () => 'EGP' }));

const { default: Workshops } = await import('./Workshops.jsx');

describe('Workshops section', () => {
  it('shows a compact "Coming soon" band, with no cards, when nothing is scheduled', () => {
    site.workshops = [];
    const html = renderToString(<Workshops />);
    expect(html).toContain('Coming soon');
    expect(html).not.toContain('<article');
    expect(html).not.toContain('section-pad'); // the big padded section is only for real workshops
  });

  it('shows the workshop cards when there are upcoming workshops', () => {
    site.workshops = [{ id: 'w1', title: 'Year-End Circle', starts_at: '2026-12-12T16:00:00Z', price_usd: 35, seats_shown: 3 }];
    const html = renderToString(<Workshops />);
    expect(html).toContain('<article');
    expect(html).toContain('Year-End Circle');
    expect(html).not.toContain('Coming soon');
  });

  it('says Sold out when a workshop is full', () => {
    site.workshops = [{ id: 'w1', title: 'Full One', starts_at: '2026-12-12T16:00:00Z', price_usd: 35, sold_out: true }];
    expect(renderToString(<Workshops />)).toContain('Sold out');
  });
});
