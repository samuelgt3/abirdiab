import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { assetUrl } from '../lib/content.js';
import { slugify } from '../lib/slug.js';
import { supabase } from '../lib/supabase.js';
import EditDialog from './EditDialog.jsx';
import { removeMedia } from './storage.js';
import { SECTIONS } from './schema.js';
import { Badge, Chip, ConfirmDialog, Empty, Icon, PageHeader, SearchBox, Skeleton, Switch } from './ui.jsx';

const TITLE_KEY = { testimonials: 'name' };
const SINGULAR = { testimonials: 'testimonial', courses: 'course or material', workshops: 'workshop', journal_posts: 'journal post', meditation_samples: 'guided meditation' };
const ICON = { testimonials: 'testimonials', courses: 'courses', workshops: 'workshops', journal_posts: 'journal', meditation_samples: 'headphones' };

/** Where an item appears on the public site (null = nowhere specific). */
function siteUrl(table, r) {
  const base = import.meta.env.BASE_URL;
  if (table === 'courses') return `${base}materials/${slugify(r.title)}`;
  if (table === 'journal_posts') return `${base}journal/${slugify(r.title)}`;
  if (table === 'workshops') return `${base}#workshop`;
  if (table === 'testimonials') return `${base}testimonials`;
  if (table === 'meditation_samples') return `${base}#meditations`;
  return null;
}

const searchText = (r) => Object.values(r).filter((v) => typeof v === 'string' && v.length < 400).join(' ').toLowerCase();

function Thumb({ r, table }) {
  const src = r.image_url && !/\.(mp3|pdf)$/i.test(r.image_url) ? assetUrl(r.image_url) : '';
  if (src) return <img src={src} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg bg-sand object-cover" />;
  return <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-green/10 text-green"><Icon name={ICON[table]} size={22} /></span>;
}

/** One screen for testimonials, courses, workshops and journal posts. */
export default function ContentList({ toast }) {
  const { table } = useParams();
  const known = Object.prototype.hasOwnProperty.call(SECTIONS, table);
  if (!known) return <Empty icon="alert" title="Page not found">Use the menu on the left.</Empty>;
  return <List key={table} table={table} toast={toast} />;
}

function List({ table, toast }) {
  const section = useMemo(() => ({ ...SECTIONS[table], table, singular: SINGULAR[table] }), [table]);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(params.get('new') ? null : undefined); // undefined closed, null new, row
  useEffect(() => { if (params.get('new')) setParams({}, { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await supabase.from(table).select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (r.error) { setError(r.error.message); return; }
    setError('');
    setRows(r.data);
  }, [table]);
  useEffect(() => { load(); }, [load]);

  // optional columns (added by later migrations) only show when the database has them
  const fields = section.fields.filter((f) => !f.optional || (rows && rows.length && f.key in rows[0]));
  const nameKey = TITLE_KEY[table] || 'title';

  const needle = q.trim().toLowerCase();
  const shown = (rows || []).filter((r) => (filter === 'all' || (filter === 'visible' ? r.published : !r.published)) && (!needle || searchText(r).includes(needle)));
  const canReorder = !needle && filter === 'all';
  const visibleCount = (rows || []).filter((r) => r.published).length;

  async function toggle(r) {
    setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, published: !r.published } : x))); // instant feedback
    const res = await supabase.from(table).update({ published: !r.published }).eq('id', r.id);
    if (res.error) { toast(`Could not change: ${res.error.message}`, true); load(); return; }
    toast(r.published ? 'Hidden from the website' : 'Now visible on the website');
  }

  async function move(r, d) {
    const arr = rows.slice();
    const i = arr.findIndex((x) => x.id === r.id);
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setRows(arr.map((x, idx) => ({ ...x, sort_order: idx + 1 })));
    const results = await Promise.all(arr.map((x, idx) => (x.sort_order === idx + 1 ? { error: null } : supabase.from(table).update({ sort_order: idx + 1 }).eq('id', x.id))));
    const bad = results.find((x) => x.error);
    if (bad) toast(`Could not reorder: ${bad.error.message}`, true);
    load();
  }

  async function duplicate(r) {
    // eslint-disable-next-line no-unused-vars
    const { id, created_at, ...rest } = r;
    const max = Math.max(0, ...rows.map((x) => x.sort_order || 0));
    const res = await supabase.from(table).insert({ ...rest, [nameKey]: `${r[nameKey]} (copy)`, published: false, sort_order: max + 1 });
    if (res.error) return toast(`Could not duplicate: ${res.error.message}`, true);
    toast('Copy created (hidden) — edit it, then switch it on');
    return load();
  }

  async function confirmDelete() {
    setBusy(true);
    const res = await supabase.from(table).delete().eq('id', deleting.id);
    setBusy(false);
    setDeleting(null);
    if (res.error) return toast(`Could not delete: ${res.error.message}`, true);
    // the item's uploaded pictures / audio go with it
    await removeMedia(section.fields.filter((f) => f.type === 'file').map((f) => deleting[f.key]));
    toast('Deleted');
    return load();
  }

  const iconBtn = 'rounded-lg p-2 text-ink/60 transition hover:bg-green/10 hover:text-green disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div>
      <PageHeader title={section.label} sub={section.note}
        actions={<button type="button" className="btn-solid !gap-2 !py-2.5" onClick={() => setEditing(null)}><Icon name="plus" size={16} /> Add new</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder={`Search ${section.label.toLowerCase()}…`} />
        <Chip on={filter === 'all'} onClick={() => setFilter('all')} count={rows?.length}>All</Chip>
        <Chip on={filter === 'visible'} onClick={() => setFilter('visible')} count={visibleCount}>Visible</Chip>
        <Chip on={filter === 'hidden'} onClick={() => setFilter('hidden')} count={rows ? rows.length - visibleCount : undefined}>Hidden</Chip>
        {!canReorder && rows?.length > 1 && <span className="text-[12.5px] text-ink/70">Clear search and filters to change the order.</span>}
      </div>

      {error && <p className="font-semibold text-danger">Could not load: {error}</p>}
      {!rows && !error && <Skeleton />}
      {rows && rows.length === 0 && <Empty icon={ICON[table]} title={`No ${section.label.toLowerCase()} yet`}>Press “Add new” to create the first one.</Empty>}
      {rows && rows.length > 0 && shown.length === 0 && <Empty icon="search" title="Nothing matches">Try a different word, or clear the filters.</Empty>}

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {shown.map((r, i) => {
          const url = siteUrl(table, r);
          return (
            <li key={r.id} className={`flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 transition sm:flex-nowrap ${r.published ? 'border-green/15' : 'border-dashed border-ink/20 bg-white/60'}`}>
              <Thumb r={r} table={table} />
              <button type="button" onClick={() => setEditing(r)} className="min-w-0 flex-1 text-start">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-ink">{section.title(r) || '(untitled)'}</span>
                  {!r.published && <Badge tone="gray">Hidden</Badge>}
                  {table === 'courses' && r.is_free && <Badge tone="green">Free</Badge>}
                  {table === 'workshops' && r.starts_at && new Date(r.starts_at) < new Date() && <Badge tone="amber">Past — hidden on site</Badge>}
                </div>
                <div className="truncate text-[13px] text-ink/60">{section.sub(r)}</div>
              </button>
              <div className="flex items-center gap-1.5">
                <Switch checked={r.published} onChange={() => toggle(r)} label={`${r.published ? 'Hide' : 'Show'} ${section.title(r)}`} />
                <span className="hidden w-14 text-[12px] text-ink/70 sm:block">{r.published ? 'Visible' : 'Hidden'}</span>
              </div>
              <div className="ms-auto flex items-center sm:ms-0">
                <button type="button" className={iconBtn} aria-label="Move up" title="Move up" disabled={!canReorder || i === 0} onClick={() => move(r, -1)}><Icon name="up" size={16} /></button>
                <button type="button" className={iconBtn} aria-label="Move down" title="Move down" disabled={!canReorder || i === shown.length - 1} onClick={() => move(r, 1)}><Icon name="down" size={16} /></button>
                <button type="button" className={iconBtn} aria-label="Duplicate" title="Duplicate" onClick={() => duplicate(r)}><Icon name="copy" size={16} /></button>
                {url && r.published && <a className={`${iconBtn} inline-flex`} aria-label="View on website" title="View on website" href={url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /></a>}
                <button type="button" className="btn-outline mx-1 !px-3 !py-1.5 !text-[13px]" onClick={() => setEditing(r)}>Edit</button>
                <button type="button" className={`${iconBtn} hover:!bg-danger/10 hover:!text-danger`} aria-label="Delete" title="Delete" onClick={() => setDeleting(r)}><Icon name="trash" size={16} /></button>
              </div>
            </li>
          );
        })}
      </ul>

      {editing !== undefined && rows && (
        <EditDialog section={section} row={editing} rows={rows} fields={fields} onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); toast('Saved'); load(); }} />
      )}
      <ConfirmDialog open={!!deleting} title="Delete this item?" confirmLabel="Yes, delete" danger busy={busy}
        onCancel={() => setDeleting(null)} onConfirm={confirmDelete}>
        You are about to delete “{deleting && (section.title(deleting) || 'this item')}”. This cannot be undone.
        If you only want it off the website for now, switch it to <strong>Hidden</strong> instead.
      </ConfirmDialog>
    </div>
  );
}
