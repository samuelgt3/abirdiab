import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BookingCard from '../../components/BookingCard.jsx';
import { useCheckout } from '../../components/checkout/CheckoutContext.jsx';
import { filterBookings, whenCounts } from '../../lib/accountFilter.js';
import Empty from './Empty.jsx';
import FilterBar from './FilterBar.jsx';

/**
 * "1:1 Sessions" and "Workshops": one list each, with filters (all / upcoming / past), a search box and a sort menu.
 * kind = 'session' | 'workshop'
 */
export default function BookingsList({ p, lang, kind, orders }) {
  const { bookSession } = useCheckout();
  const L = p.list;
  const [when, setWhen] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('smart');

  const mine = useMemo(() => (orders || []).filter((o) => o.kind === kind), [orders, kind]);
  const counts = useMemo(() => whenCounts(mine), [mine]);
  const shown = useMemo(() => filterBookings(mine, { when, q, sort }, { lang }), [mine, when, q, sort, lang]);

  if (orders === null) return <p className="text-ink/75">…</p>;
  if (mine.length === 0) {
    return (
      <Empty title={p.empty[kind === 'session' ? 'sessions' : 'workshops']} lead={p.empty[kind === 'session' ? 'sessionsLead' : 'workshopsLead']}>
        {kind === 'session'
          ? <button type="button" className="btn-solid" onClick={bookSession}>{p.book}</button>
          : <Link to="/#workshop" className="btn-solid !text-cream no-underline">{p.seeWorkshops}</Link>}
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <FilterBar label={L.label} value={when} onChange={setWhen} q={q} onQ={setQ} searchLabel={L.search}
        chips={[{ key: 'all', label: L.all, count: counts.all }, { key: 'upcoming', label: p.upcoming, count: counts.upcoming }, { key: 'past', label: p.past, count: counts.past }]}
        select={{ label: L.sortBy, value: sort, onChange: setSort, options: [{ key: 'smart', label: L.sortSmart }, { key: 'newest', label: L.sortNewest }, { key: 'oldest', label: L.sortOldest }] }} />
      {shown.length === 0 && <p className="m-0 text-ink/75">{L.noMatch}</p>}
      <div className="flex flex-col gap-4">{shown.map((b) => <BookingCard key={b.ref} b={b} showPageLink />)}</div>
    </div>
  );
}
