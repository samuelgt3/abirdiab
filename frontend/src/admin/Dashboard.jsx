import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { eventStart } from './OrdersView.jsx';
import { Badge, Icon, JoinButton, Skeleton, fmtDate, money } from './ui.jsx';

const DAY = 24 * 3600 * 1000;
const KIND = { session: '1:1 Session', workshop: 'Workshop seat', course: 'Material', gift: 'Gift' };
const when = (d, tz) => d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz || undefined });

const DOT = { red: 'bg-danger', amber: 'bg-accent' };

/** One to-do line: coloured dot, what, where it goes. */
function Todo({ tone, to, title, hint, cta }) {
  return (
    <li>
      <Link to={to} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 no-underline transition hover:bg-green/5">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[tone]}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{title}</span>
          {hint && <span className="block truncate text-[12.5px] text-ink/70">{hint}</span>}
        </span>
        <span className="shrink-0 rounded-full border border-green/25 px-3 py-1 text-[12.5px] font-semibold text-green transition group-hover:bg-green group-hover:text-cream">{cta}</span>
      </Link>
    </li>
  );
}

function Stat({ icon, label, value, note, to, tone = 'green' }) {
  const colour = { green: 'bg-green/10 text-green', amber: 'bg-accent/20 text-terracotta', gold: 'bg-gold/20 text-[#8a6717]' }[tone];
  const body = (
    <>
      <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${colour}`}><Icon name={icon} size={20} /></span>
      <span className="min-w-0">
        <span className="block text-[12.5px] text-ink/60">{label}</span>
        <span className="block font-serif text-[1.5rem] leading-tight text-ink sm:text-[1.65rem]">{value}</span>
        <span className="block truncate text-[12px] text-ink/70">{note}</span>
      </span>
    </>
  );
  const cls = 'flex items-center gap-3 rounded-2xl border border-green/12 bg-white p-3.5 no-underline sm:p-4 shadow-[0_1px_3px_rgba(18,63,53,.05)]';
  return to ? <Link to={to} className={`${cls} transition hover:shadow-md`}>{body}</Link> : <div className={cls}>{body}</div>;
}

const Panel = ({ title, action, children, className = '' }) => (
  <section className={`rounded-2xl border border-green/12 bg-white p-4 shadow-[0_1px_3px_rgba(18,63,53,.05)] sm:p-5 ${className}`}>
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="m-0 font-serif text-[1.2rem] font-normal">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      const [o, w, l, st, sub, set, av] = await Promise.all([
        supabase.from('orders').select('*').neq('status', 'awaiting_payment').order('created_at', { ascending: false }).limit(400),
        supabase.from('workshops').select('id,title,starts_at,spots,published').gt('starts_at', now).order('starts_at'),
        supabase.from('workshop_links').select('workshop_id,join_link'),
        supabase.from('testimonial_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }),
        supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('availability_slots').select('id', { count: 'exact', head: true }).gte('slot_date', today),
      ]);
      if (!alive) return;
      if (o.error) { setError(o.error.message); return; }
      setD({ orders: o.data, workshops: w.data || [], links: new Map((l.data || []).map((x) => [x.workshop_id, x.join_link])), stories: st.count || 0, subscribers: sub.count || 0, settings: set.data || {}, slots: av.count || 0 });
    })();
    return () => { alive = false; };
  }, []);

  const v = useMemo(() => {
    if (!d) return null;
    const starts = Object.fromEntries(d.workshops.map((x) => [x.id, x.starts_at]));
    const now = Date.now();
    const isPaid = (x) => ['paid', 'confirmed', 'completed'].includes(x.status);
    const orders = d.orders.map((x) => ({ ...x, start: eventStart(x, starts) }));
    const upcoming = orders.filter((x) => x.start && x.start.getTime() > now - 3600e3 && x.start.getTime() < now + 14 * DAY && ['paid', 'confirmed'].includes(x.status))
      .sort((a, b) => a.start - b.start);
    const needLink = upcoming.filter((x) => isPaid(x) && !(x.kind === 'session' ? x.join_url : d.links.has(x.item_id)) && x.start.getTime() < now + (x.kind === 'session' ? 3 : 7) * DAY);
    const workshopsNoLink = d.workshops.filter((x) => x.published && !d.links.has(x.id) && new Date(x.starts_at).getTime() < now + 14 * DAY);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const paidMonth = orders.filter((x) => isPaid(x) && new Date(x.paid_at || x.created_at) >= monthStart);
    return { orders, upcoming, needLink, workshopsNoLink, paidMonth, revenue: paidMonth.reduce((s, x) => s + Number(x.amount_usd || 0), 0) };
  }, [d]);

  if (error) return <p className="font-semibold text-danger">Could not load: {error}</p>;
  if (!d || !v) return <Skeleton rows={6} />;

  const todos = [];
  if (v.needLink.length) todos.push(<Todo key="nl" tone="red" to="/admin/orders" cta="Add link" title={`${v.needLink.length} paid ${v.needLink.length === 1 ? 'booking needs' : 'bookings need'} a joining link`} hint={v.needLink.slice(0, 3).map((x) => `${x.customer_name} (${KIND[x.kind]})`).join(' · ')} />);
  if (v.workshopsNoLink.length) todos.push(<Todo key="wl" tone="red" to="/admin/workshops" cta="Open" title={`${v.workshopsNoLink.length} upcoming ${v.workshopsNoLink.length === 1 ? 'workshop has' : 'workshops have'} no joining link`} hint={v.workshopsNoLink.map((x) => x.title).join(' · ')} />);
  if (d.stories) todos.push(<Todo key="st" tone="amber" to="/admin/stories" cta="Read" title={`${d.stories} new ${d.stories === 1 ? 'story' : 'stories'} from visitors`} hint="Add the good ones as testimonials" />);

  const hasPrice = d.settings.session_price_usd !== null && d.settings.session_price_usd !== undefined;
  const setup = [
    { done: hasPrice, label: 'Set your 1:1 session price', to: '/admin/availability' },
    { done: d.slots > 0, label: 'Post the days and times you are free', to: '/admin/availability' },
    { done: !!d.settings.payments_enabled, label: 'Switch on card payments', to: '/admin/settings' },
    { done: !!d.settings.google_signin_enabled, label: 'Switch on Google sign-in', to: '/admin/settings' },
    { done: d.workshops.length > 0, label: 'Add an upcoming workshop', to: '/admin/workshops?new=1' },
  ];
  const doneCount = setup.filter((x) => x.done).length;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const quick = [
    ['/admin/courses?new=1', 'courses', 'Add course'],
    ['/admin/workshops?new=1', 'workshops', 'Add workshop'],
    ['/admin/journal_posts?new=1', 'journal', 'Write post'],
    ['/admin/testimonials?new=1', 'testimonials', 'Add testimonial'],
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-serif text-[1.8rem] font-normal leading-tight">{greet}, Abir</h1>
          <p className="m-0 mt-1 text-[14px] text-ink/60">{today} · {todos.length ? `${todos.length} ${todos.length === 1 ? 'thing needs' : 'things need'} you` : 'nothing needs you right now'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quick.map(([to, , label]) => (
            <Link key={to} to={to} className="inline-flex items-center gap-1.5 rounded-full border border-green/25 bg-white px-3.5 py-1.5 text-[13px] font-semibold !text-green no-underline transition hover:bg-green hover:!text-cream">
              <Icon name="plus" size={14} />{label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon="card" label="Paid this month" value={money(v.revenue)} note={`${v.paidMonth.length} ${v.paidMonth.length === 1 ? 'booking' : 'bookings'}`} />
        <Stat icon="orders" tone="amber" label="Paid bookings" value={v.orders.filter((x) => ['paid', 'confirmed', 'completed'].includes(x.status)).length} note="all time" to="/admin/orders" />
        <Stat icon="workshops" tone="gold" label="Next 14 days" value={v.upcoming.length} note="sessions and workshop seats" />
        <Stat icon="mail" label="Newsletter" value={d.subscribers} note="subscribers" to="/admin/subscribers" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="To do">
            {todos.length ? <ul className="m-0 list-none divide-y divide-green/8 p-0">{todos}</ul> : (
              <p className="m-0 flex items-center gap-2 px-1 py-3 text-[15px] text-green"><Icon name="check" /> You're all caught up.</p>
            )}
          </Panel>

          <Panel title="Coming up" action={<Link to="/admin/orders" className="text-[13px]">All bookings</Link>}>
            {v.upcoming.length === 0 && <p className="m-0 py-3 text-[14.5px] text-ink/60">No sessions or workshop seats in the next 14 days.</p>}
            <ul className="m-0 list-none divide-y divide-green/8 p-0">
              {v.upcoming.slice(0, 8).map((x) => {
                const hasLink = x.kind === 'session' ? !!x.join_url : d.links.has(x.item_id);
                const paid = ['paid', 'confirmed'].includes(x.status);
                return (
                  <li key={x.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-green/8 leading-none text-green">
                      <span className="text-[12px] font-bold uppercase">{x.start.toLocaleDateString('en-GB', { month: 'short', timeZone: x.kind === 'session' ? x.session_timezone || undefined : undefined })}</span>
                      <span className="font-serif text-[1.15rem]">{x.start.toLocaleDateString('en-GB', { day: 'numeric', timeZone: x.kind === 'session' ? x.session_timezone || undefined : undefined })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold">{x.item_title}</span>
                      <span className="block truncate text-[12.5px] text-ink/70">{when(x.start, x.kind === 'session' ? x.session_timezone : undefined)} · {x.customer_name}</span>
                    </span>
                    {paid && <JoinButton url={x.kind === 'session' ? x.join_url : d.links.get(x.item_id)} start={x.start} />}
                    <Badge tone={paid ? 'green' : 'amber'}>{paid ? 'Paid' : 'Unpaid'}</Badge>
                    {paid && !hasLink && <Badge tone="red">No link</Badge>}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Set up your site" action={<span className="text-[12.5px] text-ink/70">{doneCount} of {setup.length}</span>}>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-green/10"><div className="h-full rounded-full bg-green transition-all" style={{ width: `${(doneCount / setup.length) * 100}%` }} /></div>
            <ul className="m-0 list-none p-0">
              {setup.map((x) => (
                <li key={x.label}>
                  <Link to={x.to} className="flex items-center gap-2.5 rounded-lg px-1 py-2 text-[14px] no-underline hover:bg-green/5">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${x.done ? 'border-green bg-green text-cream' : 'border-ink/25'}`}>{x.done && <Icon name="check" size={12} />}</span>
                    <span className={x.done ? 'text-ink/70 line-through' : 'text-ink'}>{x.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Latest bookings" action={<Link to="/admin/orders" className="text-[13px]">View all</Link>}>
            {v.orders.length === 0 && <p className="m-0 py-3 text-[14.5px] text-ink/60">Nothing yet — new bookings will show up here.</p>}
            <ul className="m-0 list-none divide-y divide-green/8 p-0">
              {v.orders.slice(0, 5).map((x) => (
                <li key={x.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand text-[13px] font-bold text-green">{(x.customer_name || '?').trim().charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{x.customer_name}</span>
                    <span className="block truncate text-[12.5px] text-ink/70">{x.item_title} · {fmtDate(x.created_at, { dateStyle: 'medium' })}</span>
                  </span>
                  <span className="shrink-0 text-[13.5px] font-semibold text-ink/75">{x.amount_usd > 0 ? money(x.amount_usd) : 'Free'}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
