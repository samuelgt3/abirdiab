import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { downloadCsv, toCsv } from './csv.js';
import { Badge, ConfirmDialog, Empty, Icon, PageHeader, SearchBox, Skeleton, fmtDate } from './ui.jsx';

/** Newsletter sign-ups from the website footer. */
export default function SubscribersView({ toast }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    if (r.error) { setError(r.error.message); return; }
    setError('');
    setRows(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const needle = q.trim().toLowerCase();
  const shown = (rows || []).filter((r) => !needle || r.email.toLowerCase().includes(needle));

  function exportCsv() {
    const csv = toCsv(shown, [
      { header: 'Email', value: (r) => r.email },
      { header: 'Language', value: (r) => (r.lang === 'ar' ? 'Arabic' : r.lang === 'en' ? 'English' : '') },
      { header: 'Signed up', value: (r) => r.created_at },
    ]);
    downloadCsv(`subscribers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast(`Exported ${shown.length} subscribers`);
  }

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(shown.map((r) => r.email).join(', '));
      toast(`Copied ${shown.length} emails`);
    } catch { toast('Could not copy — use Export instead', true); }
  }

  async function confirmDelete() {
    setBusy(true);
    const r = await supabase.from('newsletter_subscribers').delete().eq('id', deleting.id);
    setBusy(false);
    setDeleting(null);
    if (r.error) return toast(`Could not remove: ${r.error.message}`, true);
    toast('Subscriber removed');
    return load();
  }

  return (
    <div>
      <PageHeader title="Newsletter subscribers" sub="People who signed up in the website footer."
        actions={rows?.length > 0 && (
          <>
            <button type="button" className="btn-outline !gap-2 !py-2" onClick={copyEmails}><Icon name="copy" size={16} /> Copy emails</button>
            <button type="button" className="btn-solid !gap-2 !py-2" onClick={exportCsv}><Icon name="download" size={16} /> Export CSV</button>
          </>
        )} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search email…" />
        {rows && <span className="text-[13px] text-ink/60">{needle ? `${shown.length} of ${rows.length}` : `${rows.length} total`}</span>}
      </div>

      {error && <p className="font-semibold text-danger">Could not load: {error}</p>}
      {!rows && !error && <Skeleton />}
      {rows && rows.length === 0 && <Empty icon="mail" title="No subscribers yet">When visitors sign up in the footer, they appear here.</Empty>}
      {rows && rows.length > 0 && shown.length === 0 && <Empty icon="search" title="Nothing matches">Try a different search.</Empty>}

      {shown.length > 0 && (
        <ul className="m-0 flex list-none flex-col divide-y divide-green/10 overflow-hidden rounded-xl border border-green/15 bg-white p-0">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[14.5px]" dir="ltr"><a href={`mailto:${r.email}`}>{r.email}</a></span>
              {r.lang && <Badge tone="gray">{r.lang === 'ar' ? 'Arabic' : 'English'}</Badge>}
              <span className="hidden text-[12.5px] text-ink/70 sm:block">{fmtDate(r.created_at, { dateStyle: 'medium' })}</span>
              <button type="button" aria-label={`Remove ${r.email}`} title="Remove" onClick={() => setDeleting(r)}
                className="rounded-lg p-2 text-ink/70 transition hover:bg-danger/10 hover:text-danger"><Icon name="trash" size={16} /></button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog open={!!deleting} title="Remove this subscriber?" confirmLabel="Yes, remove" danger busy={busy}
        onCancel={() => setDeleting(null)} onConfirm={confirmDelete}>
        {deleting?.email} will be taken off the list. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
