import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Badge, Chip, ConfirmDialog, Empty, PageHeader, Skeleton, fmtDate } from './ui.jsx';

const TONE = { new: 'amber', published: 'green', archived: 'gray' };
const LABEL = { new: 'New', published: 'Added', archived: 'Archived' };

/** Stories sent through "Share your story". Nothing is public until Abir shows the testimonial. */
export default function StoriesView({ toast, onChanged = () => {} }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('new');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await supabase.from('testimonial_submissions').select('*').order('created_at', { ascending: false });
    if (r.error) { setError(r.error.message); return; }
    setError('');
    setRows(r.data);
    onChanged();
  }, [onChanged]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function publish(s) {
    // new written testimonial, hidden until checked; English or Arabic field depending on the language it was written in
    const ar = s.lang === 'ar';
    const max = await supabase.from('testimonials').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    const row = {
      kind: 'written',
      name: s.name,
      ...(ar ? { name_ar: s.name, quote_ar: s.story, role_ar: s.service } : { quote: s.story, role: s.service }),
      sort_order: ((max.data && max.data[0]?.sort_order) || 0) + 1,
      published: false,
    };
    const ins = await supabase.from('testimonials').insert(row);
    if (ins.error) return toast(`Could not add: ${ins.error.message}`, true);
    await supabase.from('testimonial_submissions').update({ status: 'published' }).eq('id', s.id);
    toast('Added to Testimonials as Hidden — tidy it there, add the translation, then switch it on');
    return load();
  }
  async function setStatus(s, status) {
    const r = await supabase.from('testimonial_submissions').update({ status }).eq('id', s.id);
    if (r.error) return toast(`Could not change: ${r.error.message}`, true);
    return load();
  }
  async function confirmDelete() {
    setBusy(true);
    const r = await supabase.from('testimonial_submissions').delete().eq('id', deleting.id);
    setBusy(false);
    setDeleting(null);
    if (r.error) return toast(`Could not delete: ${r.error.message}`, true);
    toast('Deleted');
    return load();
  }

  const count = (st) => (rows || []).filter((x) => x.status === st).length;
  const shown = (rows || []).filter((x) => filter === 'all' || x.status === filter);

  return (
    <div>
      <PageHeader title="Story submissions"
        sub="Sent by visitors through “Share your story”. Everyone ticked the consent box. “Add as testimonial” copies it into Testimonials as Hidden, so you can tidy it before showing it." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip on={filter === 'new'} onClick={() => setFilter('new')} count={rows ? count('new') : undefined}>New</Chip>
        <Chip on={filter === 'published'} onClick={() => setFilter('published')} count={rows ? count('published') : undefined}>Added</Chip>
        <Chip on={filter === 'archived'} onClick={() => setFilter('archived')} count={rows ? count('archived') : undefined}>Archived</Chip>
        <Chip on={filter === 'all'} onClick={() => setFilter('all')} count={rows?.length}>All</Chip>
      </div>

      {error && <p className="font-semibold text-danger">Could not load: {error}</p>}
      {!rows && !error && <Skeleton />}
      {rows && shown.length === 0 && <Empty icon="stories" title={filter === 'new' ? 'No new stories' : 'Nothing here'}>{filter === 'new' ? 'You are all caught up.' : 'Try another tab.'}</Empty>}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {shown.map((s) => (
          <li key={s.id} className="rounded-xl border border-green/15 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1 font-semibold">{s.name}{s.service ? <span className="font-normal text-ink/60"> · {s.service}</span> : ''}</span>
              <Badge tone={TONE[s.status] || 'gray'}>{LABEL[s.status] || s.status}</Badge>
              <span className="text-[12.5px] text-ink/70">{fmtDate(s.created_at, { dateStyle: 'medium' })}</span>
            </div>
            <p dir={s.lang === 'ar' ? 'rtl' : 'ltr'} className="my-3 whitespace-pre-line text-[15px] leading-relaxed">{s.story}</p>
            {s.email && <div className="mb-3 text-[13.5px]" dir="ltr"><a href={`mailto:${s.email}`}>{s.email}</a></div>}
            <div className="flex flex-wrap gap-2">
              {s.status !== 'published' && <button type="button" className="btn-solid !px-3.5 !py-1.5 !text-[13px]" onClick={() => publish(s)}>Add as testimonial</button>}
              {s.status === 'new' && <button type="button" className="btn-outline !px-3.5 !py-1.5 !text-[13px]" onClick={() => setStatus(s, 'archived')}>Archive</button>}
              {s.status === 'archived' && <button type="button" className="btn-outline !px-3.5 !py-1.5 !text-[13px]" onClick={() => setStatus(s, 'new')}>Move back to New</button>}
              <button type="button" className="btn-outline !px-3.5 !py-1.5 !text-[13px] !text-danger" onClick={() => setDeleting(s)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog open={!!deleting} title="Delete this story?" confirmLabel="Yes, delete" danger busy={busy}
        onCancel={() => setDeleting(null)} onConfirm={confirmDelete}>
        The story from “{deleting?.name}” will be deleted. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
