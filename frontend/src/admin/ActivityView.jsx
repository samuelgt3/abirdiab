import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Badge, Card, Empty, PageHeader, Skeleton, fmtDate } from './ui.jsx';

const LABEL = {
  site_settings: 'Settings', workshops: 'Workshops', courses: 'Courses', orders: 'Bookings', availability_slots: 'Availability',
  meditation_samples: 'Meditations', testimonials: 'Testimonials', journal_posts: 'Journal', workshop_links: 'Workshop links', course_files: 'Course files',
};
const OP = { INSERT: ['green', 'Added'], UPDATE: ['gray', 'Changed'], DELETE: ['red', 'Deleted'] };

/** Who changed what in the admin (newest first). Personal details and links are never copied into the log. */
export default function ActivityView() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    supabase.from('admin_audit').select('*').order('at', { ascending: false }).limit(200).then((r) => {
      if (r.error) setError(r.error.message); else setRows(r.data);
    });
  }, []);
  if (error) return <p className="font-semibold text-danger">Could not load: {error}</p>;
  if (!rows) return <Skeleton rows={5} />;
  return (
    <div className="pb-10">
      <PageHeader title="Activity log" sub="The last 200 changes made in the admin: who, when, and what. It starts from the day this was switched on." />
      {rows.length === 0 ? <Empty icon="check" title="Nothing yet">Changes you make in the admin will be listed here.</Empty> : (
        <Card className="!p-0">
          <ul className="m-0 list-none divide-y divide-green/10 p-0">
            {rows.map((r) => {
              const [tone, word] = OP[r.op] || ['gray', r.op];
              const fields = r.changes ? Object.keys(r.changes) : [];
              return (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-[14px]">
                  <Badge tone={tone}>{word}</Badge>
                  <span className="font-semibold">{LABEL[r.table_name] || r.table_name}</span>
                  {r.summary && <span className="text-ink/80">{r.summary}</span>}
                  {fields.length > 0 && <span className="text-ink/60">({fields.join(', ')})</span>}
                  <span className="ms-auto text-[12.5px] text-ink/65">{r.actor_email || 'admin'} · {fmtDate(r.at)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
