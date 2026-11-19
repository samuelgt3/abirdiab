import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, todayIn } from '../lib/orders.js';
import { supabase } from '../lib/supabase.js';
import { Badge, Card, Icon, PageHeader, Skeleton } from './ui.jsx';

const ZONES = ['Asia/Dubai', 'Africa/Cairo', 'Asia/Riyadh', 'Asia/Amman', 'Asia/Beirut', 'Europe/London', 'UTC'];
const PRESETS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymd = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dow = (s) => new Date(`${s}T12:00:00Z`).getUTCDay();
const niceDay = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Sessions: the price, and the exact dates and times Abir is free. Only these appear on the booking window. */
export default function AvailabilityView({ toast }) {
  const [s, setS] = useState(null);
  const [slots, setSlots] = useState(null);
  const [booked, setBooked] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState([]); // selected dates
  const [times, setTimes] = useState([]); // selected times to add
  const [custom, setCustom] = useState('');
  const [month, setMonth] = useState(null); // { y, m }

  const load = useCallback(async () => {
    const st = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
    if (st.error) { setError(st.error.message); return; }
    const tz = st.data.booking_timezone;
    const from = addDays(todayIn(tz), -1);
    const [sl, od] = await Promise.all([
      supabase.from('availability_slots').select('*').gte('slot_date', from).order('slot_date').order('slot_time'),
      supabase.from('orders').select('session_date,session_time,customer_name,status,ref').eq('kind', 'session').gte('session_date', from)
        .in('status', ['awaiting_payment', 'paid', 'confirmed', 'completed']),
    ]);
    if (sl.error) { setError(sl.error.message); return; }
    setError('');
    setS((cur) => cur || { ...st.data });
    setSlots(sl.data);
    setBooked(Object.fromEntries((od.data || []).map((o) => [`${o.session_date}|${o.session_time}`, o])));
    setMonth((m) => m || { y: +todayIn(tz).slice(0, 4), m: +todayIn(tz).slice(5, 7) - 1 });
  }, []);
  useEffect(() => { load(); }, [load]);

  const tz = s?.booking_timezone || 'Asia/Dubai';
  const today = todayIn(tz);

  const byDay = useMemo(() => {
    const m = {};
    (slots || []).forEach((x) => { if (x.slot_date >= today) (m[x.slot_date] ||= []).push(x); });
    return m;
  }, [slots, today]);

  async function saveDetails(e) {
    e.preventDefault();
    setSaving(true);
    const r = await supabase.from('site_settings').update({
      session_price_usd: s.session_price_usd === '' || s.session_price_usd == null ? null : Number(s.session_price_usd),
      session_length: s.session_length, session_length_ar: s.session_length_ar, booking_timezone: s.booking_timezone,
      session_link_base: (s.session_link_base || '').trim() || 'https://meet.jit.si/',
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    if (r.error) return toast(`Could not save: ${r.error.message}`, true);
    return toast('Session details saved');
  }

  const toggle = (_list, setList, v) => setList((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].sort()));

  async function addSlots() {
    const all = [...times];
    const c = custom.trim();
    if (c) {
      if (!TIME_RE.test(c)) return toast(`"${c}" is not a time. Use 24-hour HH:MM, e.g. 14:30`, true);
      all.push(c);
    }
    if (!picked.length) return toast('Pick at least one day on the calendar', true);
    if (!all.length) return toast('Pick at least one time', true);
    const rows = picked.flatMap((d) => [...new Set(all)].map((t) => ({ slot_date: d, slot_time: t })));
    const r = await supabase.from('availability_slots').upsert(rows, { onConflict: 'slot_date,slot_time', ignoreDuplicates: true });
    if (r.error) return toast(`Could not add: ${r.error.message}`, true);
    toast(`Added ${picked.length} ${picked.length === 1 ? 'day' : 'days'} × ${new Set(all).size} ${new Set(all).size === 1 ? 'time' : 'times'}`);
    setPicked([]);
    setCustom('');
    return load();
  }

  async function removeSlot(x) {
    const r = await supabase.from('availability_slots').delete().eq('id', x.id);
    if (r.error) return toast(`Could not remove: ${r.error.message}`, true);
    setSlots((cur) => cur.filter((y) => y.id !== x.id));
    return null;
  }
  async function clearDay(d) {
    const freeIds = byDay[d].filter((x) => !booked[`${x.slot_date}|${x.slot_time}`]).map((x) => x.id);
    if (!freeIds.length) return;
    const r = await supabase.from('availability_slots').delete().in('id', freeIds);
    if (r.error) return toast(`Could not remove: ${r.error.message}`, true);
    toast('Free times removed for that day');
    load();
  }

  if (error) return <p className="font-semibold text-danger">Could not load: {error}</p>;
  if (!s || !slots || !month) return <Skeleton rows={4} />;

  // ---- calendar
  const first = new Date(Date.UTC(month.y, month.m, 1));
  const lead = first.getUTCDay();
  const daysIn = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => ymd(month.y, month.m, i + 1))];
  const monthName = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shift = (n) => setMonth(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const futureCells = cells.filter((d) => d && d >= today);
  const selectWeekday = (i) => {
    const ds = futureCells.filter((d) => dow(d) === i);
    const all = ds.every((d) => picked.includes(d));
    setPicked((cur) => (all ? cur.filter((d) => !ds.includes(d)) : [...new Set([...cur, ...ds])].sort()));
  };
  const nSlots = Object.values(byDay).reduce((n, a) => n + a.length, 0);

  return (
    <div className="pb-10">
      <PageHeader title="Sessions & availability"
        sub="Set your 1:1 session price, then post the days and times you are free. Visitors can only book the times listed here, and a time disappears once it is booked." />

      <Card className="mb-5">
        <h2 className="mb-3 mt-0 font-serif text-[1.25rem] font-normal">Session details</h2>
        <form onSubmit={saveDetails}>
          <div className="grid gap-x-5 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="a-price">Price per session (US dollars)</label>
              <input id="a-price" type="number" min="0" step="0.01" className="input" value={s.session_price_usd ?? ''}
                onChange={(e) => setS({ ...s, session_price_usd: e.target.value })} />
              <small className="text-ink/60">Visitors see it converted to their currency. Empty = “Price confirmed after booking”.</small>
            </div>
            <div>
              <label className="label" htmlFor="a-zone">Your times are in this time zone</label>
              <select id="a-zone" className="input" value={s.booking_timezone} onChange={(e) => setS({ ...s, booking_timezone: e.target.value })}>
                {[...new Set([s.booking_timezone, ...ZONES])].map((z) => <option key={z}>{z}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="a-link">Where each booked session happens (link start)</label>
              <input id="a-link" dir="ltr" className="input" value={s.session_link_base ?? 'https://meet.jit.si/'} onChange={(e) => setS({ ...s, session_link_base: e.target.value })} />
              <small className="text-ink/60">Each paid session gets its own private link made from this start (for example https://meet.jit.si/AbirDiab-1a2b3c…). It is shown to the customer and emailed straight away. You can paste a different link on any booking in Orders. With the free Jitsi service you sign in once as the host.</small>
            </div>
            <div>
              <label className="label" htmlFor="a-len">Session length (English)</label>
              <input id="a-len" className="input" value={s.session_length || ''} onChange={(e) => setS({ ...s, session_length: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="a-len-ar" dir="rtl">Session length (Arabic)</label>
              <input id="a-len-ar" dir="rtl" className="input" value={s.session_length_ar || ''} onChange={(e) => setS({ ...s, session_length_ar: e.target.value })} />
            </div>
          </div>
          <div className="mt-4"><button type="submit" className="btn-solid !py-2" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button></div>
        </form>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <h2 className="mb-1 mt-0 font-serif text-[1.25rem] font-normal">1. Pick the days you are free</h2>
          <p className="mb-3 mt-0 text-[13.5px] text-ink/60">Click days to select them (click again to unselect). Tap a weekday name to select every one in this month.</p>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" className="rounded-lg p-2 hover:bg-green/10" onClick={() => shift(-1)}><Icon name="down" size={16} className="rotate-90" /></button>
            <div className="font-semibold">{monthName}</div>
            <button type="button" aria-label="Next month" className="rounded-lg p-2 hover:bg-green/10" onClick={() => shift(1)}><Icon name="down" size={16} className="-rotate-90" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK.map((w, i) => (
              <button key={w} type="button" onClick={() => selectWeekday(i)} className="rounded py-1 text-[11.5px] font-semibold uppercase tracking-wide text-ink/70 hover:bg-green/10 hover:text-green">{w}</button>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={`b${i}`} />;
              const past = d < today;
              const on = picked.includes(d);
              const n = byDay[d]?.length || 0;
              return (
                <button key={d} type="button" disabled={past} aria-pressed={on} onClick={() => toggle(picked, setPicked, d)}
                  className={`relative flex h-11 flex-col items-center justify-center rounded-lg border text-[14px] transition disabled:cursor-not-allowed disabled:border-transparent disabled:text-ink/25 ${on ? 'border-green bg-green font-semibold text-cream' : 'border-green/15 bg-white hover:bg-green/5'}`}>
                  {+d.slice(8)}
                  {n > 0 && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${on ? 'bg-gold' : 'bg-accent'}`} title={`${n} time${n === 1 ? '' : 's'} posted`} />}
                </button>
              );
            })}
          </div>
          <p className="mb-0 mt-3 text-[12.5px] text-ink/70">An orange dot means times are already posted that day. {picked.length ? <strong>{picked.length} selected.</strong> : ''}</p>
        </Card>

        <Card>
          <h2 className="mb-1 mt-0 font-serif text-[1.25rem] font-normal">2. Choose the times</h2>
          <p className="mb-3 mt-0 text-[13.5px] text-ink/60">Times are in {tz}. The same times are added to every selected day.</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((t) => (
              <button key={t} type="button" aria-pressed={times.includes(t)} onClick={() => toggle(times, setTimes, t)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[13px] ${times.includes(t) ? 'border-green bg-green text-cream' : 'border-green/30 text-green hover:bg-green/5'}`}>{t}</button>
            ))}
          </div>
          <label className="label" htmlFor="a-custom">Another time (24-hour, e.g. 14:30)</label>
          <input id="a-custom" className="input max-w-[160px] font-mono" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="14:30" />
          <div className="mt-4">
            <button type="button" className="btn-solid !gap-2 !py-2.5" onClick={addSlots}><Icon name="plus" size={16} /> Add to {picked.length || 'selected'} {picked.length === 1 ? 'day' : 'days'}</button>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 font-serif text-[1.25rem] font-normal">Your posted availability</h2>
          <span className="text-[13px] text-ink/70">{nSlots} upcoming {nSlots === 1 ? 'time' : 'times'}</span>
        </div>
        {nSlots === 0 && <p className="m-0 rounded-lg bg-sand p-4 text-[14.5px] text-ink/70">Nothing posted yet, so visitors see “No times are open right now”. Pick days and times above.</p>}
        <ul className="m-0 flex list-none flex-col divide-y divide-green/10 p-0">
          {Object.keys(byDay).sort().map((d) => (
            <li key={d} className="py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold">{niceDay(d)}</span>
                {byDay[d].some((x) => !booked[`${x.slot_date}|${x.slot_time}`]) && (
                  <button type="button" onClick={() => clearDay(d)} className="text-[12.5px] text-danger underline underline-offset-4">Remove free times</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {byDay[d].map((x) => {
                  const b = booked[`${x.slot_date}|${x.slot_time}`];
                  return b ? (
                    <span key={x.id} className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-[13px]" title={`${b.customer_name} · ${b.ref}`}>
                      <span className="font-mono">{x.slot_time}</span><Badge tone="amber">Booked · {b.customer_name}</Badge>
                    </span>
                  ) : (
                    <span key={x.id} className="inline-flex items-center gap-1.5 rounded-full border border-green/25 bg-white py-1 pe-1 ps-3 text-[13px]">
                      <span className="font-mono">{x.slot_time}</span>
                      <button type="button" aria-label={`Remove ${x.slot_time} on ${niceDay(d)}`} onClick={() => removeSlot(x)} className="rounded-full p-1 text-ink/45 hover:bg-danger/10 hover:text-danger"><Icon name="close" size={13} /></button>
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
