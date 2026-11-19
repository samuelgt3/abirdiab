import { useCallback, useEffect, useMemo, useState } from 'react';
import { zonedToUtc } from '../lib/orders.js';
import { supabase } from '../lib/supabase.js';
import { downloadCsv, toCsv } from './csv.js';
import { Badge, Chip, ConfirmDialog, Empty, Icon, JoinButton, PageHeader, SearchBox, Skeleton, fmtDate, money } from './ui.jsx';

const STATUSES = [
  ['paid', 'Paid', 'green'],
  ['confirmed', 'Confirmed', 'green'],
  ['completed', 'Completed', 'gray'],
  ['cancelled', 'Cancelled', 'red'],
  ['refunded', 'Refunded', 'red'],
];
const STATUS = Object.fromEntries(STATUSES.map(([k, l, t]) => [k, { label: l, tone: t }]));
const KIND = { session: '1:1 Session', workshop: 'Workshop seat', course: 'Material', gift: 'Gift' };
const OPEN = ['paid', 'confirmed'];
const HOUR = 3600 * 1000;

export const eventStart = (o, workshopStarts) => {
  if (o.kind === 'session' && o.session_date && o.session_time) return zonedToUtc(o.session_date, o.session_time, o.session_timezone || 'UTC');
  if (o.kind === 'workshop' && workshopStarts[o.item_id]) return new Date(workshopStarts[o.item_id]);
  return null;
};
const eventText = (o, start) =>
  start.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: o.kind === 'session' ? o.session_timezone || undefined : undefined, timeZoneName: 'short',
  });

/** Bookings & orders: everything bought or booked on the website. */
export default function OrdersView({ toast, onChanged }) {
  const [rows, setRows] = useState(null);
  const [workshopStarts, setWorkshopStarts] = useState({});
  const [workshopLinks, setWorkshopLinks] = useState(new Map()); // workshop id -> its joining link
  const [error, setError] = useState('');
  const [status, setStatus] = useState('open');
  const [kind, setKind] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [askStatus, setAskStatus] = useState(null); // { o, to }: cancelling or refunding asks first
  const [saved, setSaved] = useState(''); // which field just saved, to show a small "Saved" tick

  const load = useCallback(async () => {
    const [o, w, l, n] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('workshops').select('id,starts_at'),
      supabase.from('workshop_links').select('workshop_id,join_link'),
      supabase.from('order_admin_notes').select('order_id,notes'),
    ]);
    if (o.error) { setError(o.error.message); return; }
    setError('');
    const notes = new Map((n.data || []).map((x) => [x.order_id, x.notes]));
    // an unpaid checkout is not a booking; the private note is kept in its own table
    setRows(o.data.filter((x) => x.status !== 'awaiting_payment').map((x) => ({ ...x, admin_notes: notes.get(x.id) || null })));
    setWorkshopStarts(Object.fromEntries((w.data || []).map((x) => [x.id, x.starts_at])));
    setWorkshopLinks(new Map((l.data || []).map((x) => [x.workshop_id, x.join_link])));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function update(o, patch, msg) {
    const r = 'admin_notes' in patch
      ? await supabase.from('order_admin_notes').upsert({ order_id: o.id, notes: patch.admin_notes, updated_at: new Date().toISOString() })
      : await supabase.from('orders').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', o.id);
    if (r.error) { toast(`Could not save: ${r.error.message}`, true); return; }
    toast(msg || 'Saved');
    setSaved(`${o.id}:${Object.keys(patch)[0]}`);
    setTimeout(() => setSaved(''), 2500);
    await load();
    onChanged?.();
  }

  // decorate with the event time and a "needs a joining link" warning
  const list = useMemo(() => (rows || []).map((o) => {
    const start = eventStart(o, workshopStarts);
    const paid = ['paid', 'confirmed', 'completed'].includes(o.status);
    const soon = start && start.getTime() - Date.now() < (o.kind === 'session' ? 72 : 168) * HOUR && start.getTime() > Date.now() - 6 * HOUR;
    const hasLink = o.kind === 'session' ? !!o.join_url : workshopLinks.has(o.item_id);
    const joinUrl = o.kind === 'session' ? o.join_url : o.kind === 'workshop' ? workshopLinks.get(o.item_id) : null;
    return { ...o, joinUrl, start, needsLink: !!(paid && soon && !hasLink && (o.kind === 'session' || o.kind === 'workshop')) };
  }), [rows, workshopStarts, workshopLinks]);

  const needle = q.trim().toLowerCase();
  const shown = list.filter((o) =>
    (status === 'all' || (status === 'open' ? OPEN.includes(o.status) : o.status === status)) &&
    (kind === 'all' || o.kind === kind) &&
    (!needle || [o.customer_name, o.email, o.ref, o.item_title, o.phone].join(' ').toLowerCase().includes(needle)));

  const count = (f) => list.filter(f).length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const isPaid = (o) => ['paid', 'confirmed', 'completed'].includes(o.status);
  const paidMonth = list.filter((o) => isPaid(o) && new Date(o.paid_at || o.created_at) >= monthStart);
  const paidThisMonth = paidMonth.reduce((s, o) => s + Number(o.amount_usd || 0), 0);
  const needLink = list.filter((o) => o.needsLink);

  function exportCsv() {
    const csv = toCsv(shown, [
      { header: 'Reference', value: (o) => o.ref },
      { header: 'Created', value: (o) => o.created_at },
      { header: 'Type', value: (o) => KIND[o.kind] },
      { header: 'Item', value: (o) => o.item_title },
      { header: 'Event time', value: (o) => (o.start ? o.start.toISOString() : '') },
      { header: 'Status', value: (o) => STATUS[o.status]?.label },
      { header: 'Amount USD', value: (o) => o.amount_usd },
      { header: 'Charged', value: (o) => (o.charge_amount_cents ? `${o.charge_amount_cents / 100} ${o.charge_currency}` : '') },
      { header: 'Name', value: (o) => o.customer_name },
      { header: 'Email', value: (o) => o.email },
      { header: 'Phone', value: (o) => (o.phone ? `${o.phone_dial || ''}${o.phone}` : '') },
      { header: 'Link goes to', value: (o) => (o.delivery_method ? `${o.delivery_method}: ${o.delivery_to}` : '') },
      { header: 'Account', value: (o) => (o.user_id ? 'signed in' : 'guest') },
    ]);
    downloadCsv(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast(`Exported ${shown.length} ${shown.length === 1 ? 'row' : 'rows'}`);
  }

  const stat = 'rounded-xl border border-green/15 bg-white p-4';

  return (
    <div>
      <PageHeader title="Bookings & orders" sub="Everything customers have paid for. Unpaid checkouts are not stored here."
        actions={(
          <>
            <button type="button" className="btn-outline !gap-2 !py-2" onClick={load}><Icon name="refresh" size={15} /> Refresh</button>
            <button type="button" className="btn-outline !gap-2 !py-2" onClick={exportCsv} disabled={!shown.length}><Icon name="download" size={15} /> Export CSV</button>
          </>
        )} />

      {rows && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className={stat}>
            <div className="text-[12.5px] text-ink/60">Paid this month</div>
            <div className="font-serif text-[1.7rem] leading-tight text-green">{money(paidThisMonth)}</div>
            <div className="text-[12.5px] text-ink/70">{paidMonth.length} bookings</div>
          </div>
          <div className={stat}>
            <div className="text-[12.5px] text-ink/60">Upcoming events</div>
            <div className="font-serif text-[1.7rem] leading-tight text-ink">{count((o) => o.start && o.start > new Date() && OPEN.includes(o.status))}</div>
            <div className="text-[12.5px] text-ink/70">sessions and workshop seats</div>
          </div>
          <div className={`${stat} ${needLink.length ? 'border-danger/40 bg-danger/5' : ''}`}>
            <div className="text-[12.5px] text-ink/60">Need a joining link</div>
            <div className={`font-serif text-[1.7rem] leading-tight ${needLink.length ? 'text-danger' : 'text-green'}`}>{needLink.length}</div>
            <div className="text-[12.5px] text-ink/70">{needLink.length ? 'paid, starting soon, no link yet' : 'all set'}</div>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, email, reference…" />
        <select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-full border border-green/25 bg-white px-3 py-1.5 text-[13px] text-green">
          <option value="all">All types</option>
          {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Status">
        <Chip on={status === 'open'} onClick={() => setStatus('open')} count={rows ? count((o) => OPEN.includes(o.status)) : undefined}>Open</Chip>
        {STATUSES.map(([k, l]) => <Chip key={k} on={status === k} onClick={() => setStatus(k)} count={rows ? count((o) => o.status === k) : undefined}>{l}</Chip>)}
        <Chip on={status === 'all'} onClick={() => setStatus('all')} count={rows?.length}>All</Chip>
      </div>

      {error && <p className="font-semibold text-danger">Could not load: {error}</p>}
      {!rows && !error && <Skeleton />}
      {rows && shown.length === 0 && <Empty icon="orders" title={rows.length ? 'Nothing matches' : 'No bookings yet'}>{rows.length ? 'Try another filter or search.' : 'New bookings and purchases will appear here.'}</Empty>}

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {shown.map((o) => {
          const st = STATUS[o.status];
          const open = openId === o.id;
          const phoneFull = o.phone ? `${o.phone_dial || ''}${o.phone}`.replace(/\D/g, '') : '';
          return (
            <li key={o.id} className={`rounded-xl border bg-white ${o.needsLink ? 'border-danger/40' : 'border-green/15'}`}>
              <div className="flex flex-wrap items-center gap-3 p-3.5">
                <button type="button" className="min-w-[230px] flex-1 text-start" onClick={() => setOpenId(open ? null : o.id)} aria-expanded={open}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{o.customer_name}</span>
                    <Badge tone="gray">{KIND[o.kind]}</Badge>
                    {o.needsLink && <Badge tone="red"><Icon name="alert" size={12} /> Needs link</Badge>}
                    {!o.user_id && <Badge tone="gray">No account yet</Badge>}
                  </div>
                  <div className="text-[13.5px] text-ink/70">{o.item_title}{o.start ? ` · ${eventText(o, o.start)}` : ''}</div>
                  <div className="text-[12.5px] text-ink/70">
                    <span className="font-mono">{o.ref}</span> · {o.amount_usd > 0 ? money(o.amount_usd) : 'free'} · {fmtDate(o.created_at)}
                  </div>
                </button>
                {['paid', 'confirmed'].includes(o.status) && <JoinButton url={o.joinUrl} start={o.start} />}
                <Badge tone={st?.tone}>{st?.label || o.status}</Badge>
                <select aria-label="Change status" value={o.status} onChange={(e) => (['cancelled', 'refunded'].includes(e.target.value) ? setAskStatus({ o, to: e.target.value }) : update(o, { status: e.target.value }, 'Status updated'))}
                  className="rounded-lg border border-green/25 bg-white px-2 py-1.5 text-[13px]">
                  {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <Icon name="down" size={16} className={`text-ink/40 transition ${open ? 'rotate-180' : ''}`} />
              </div>

              {open && (
                <div className="grid gap-x-6 gap-y-2 border-t border-green/10 bg-[#f5f3ee]/70 p-4 text-[14px] sm:grid-cols-2">
                  <div><span className="text-ink/70">Email: </span><a href={`mailto:${o.email}?subject=${encodeURIComponent(`Your booking ${o.ref}`)}`}>{o.email}</a></div>
                  <div><span className="text-ink/70">Phone: </span>
                    {phoneFull ? <a href={`https://wa.me/${phoneFull}`} target="_blank" rel="noopener noreferrer" dir="ltr">{o.phone_dial} {o.phone} (WhatsApp)</a> : '—'}
                  </div>
                  {o.delivery_method && <div><span className="text-ink/70">Joining link goes to: </span>{o.delivery_method} — <span dir="ltr">{o.delivery_to}</span></div>}
                  <div><span className="text-ink/70">Account: </span>{o.user_id ? 'signed-in customer' : 'guest'}</div>
                  {o.gift_to_email && <div><span className="text-ink/70">Gift for: </span>{o.gift_to_name} ({o.gift_to_email})</div>}
                  {o.charge_amount_cents && (
                    <div><span className="text-ink/70">Card charge: </span>{(o.charge_amount_cents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })} {o.charge_currency}
                      {o.fx_rate && o.charge_currency !== 'USD' ? ` (rate ${Number(o.fx_rate).toFixed(2)})` : ''}</div>
                  )}
                  {o.paid_at && <div><span className="text-ink/70">Paid: </span>{fmtDate(o.paid_at)}</div>}
                  {o.paymob_transaction_id && <div><span className="text-ink/70">Paymob transaction: </span><span className="font-mono">{o.paymob_transaction_id}</span></div>}
                  {o.notes && <div className="sm:col-span-2"><span className="text-ink/70">Client's note: </span>{o.notes}</div>}
                  {o.gift_message && <div className="sm:col-span-2"><span className="text-ink/70">Gift message: </span>{o.gift_message}</div>}
                  {o.kind === 'session' && (
                    <label className="sm:col-span-2">
                      <span className="text-ink/70">This session's own joining link (customer sees it straight after paying){saved === `${o.id}:join_url` && <b className="ms-2 text-green">✓ Saved</b>}</span>
                      <input defaultValue={o.join_url || ''} dir="ltr" placeholder="https://…" className="input mt-1"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === (o.join_url || '')) return null;
                          if (v && !/^https:\/\//i.test(v)) { toast('The link must start with https://', true); return null; }
                          return update(o, { join_url: v || null }, 'Link saved');
                        }} />
                    </label>
                  )}
                  {o.kind === 'workshop' && !workshopLinks.has(o.item_id) && (
                    <p className="m-0 text-danger sm:col-span-2">This workshop has no joining link yet — add it under Workshops → Edit.</p>
                  )}
                  <label className="sm:col-span-2">
                    <span className="text-ink/70">Private notes (only you see these){saved === `${o.id}:admin_notes` && <b className="ms-2 text-green">✓ Saved</b>}</span>
                    <textarea defaultValue={o.admin_notes || ''} rows={2} className="input mt-1"
                      onBlur={(e) => e.target.value !== (o.admin_notes || '') && update(o, { admin_notes: e.target.value || null }, 'Note saved')} />
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog open={!!askStatus} title={askStatus ? `Mark as ${STATUS[askStatus.to].label.toLowerCase()}?` : ''} confirmLabel={askStatus ? `Yes, mark ${STATUS[askStatus.to].label.toLowerCase()}` : 'Confirm'} danger
        onCancel={() => setAskStatus(null)} onConfirm={() => { const a = askStatus; setAskStatus(null); update(a.o, { status: a.to }, 'Status updated'); }}>
        {askStatus && <>This changes “{askStatus.o.item_title}” for {askStatus.o.customer_name} ({askStatus.o.ref}) to <strong>{STATUS[askStatus.to].label}</strong>. Money is not moved by this button: refund the card in Paymob separately.</>}
      </ConfirmDialog>
    </div>
  );
}
