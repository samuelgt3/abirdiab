import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * The paid part of a course: a video id (Bunny Stream) and/or a file (PDF or audio).
 * The file goes to the PRIVATE bucket "paid-files": only people who bought the course (or anyone, if it is free) can open it.
 */
export default function PrivateFile({ value, onChange }) {
  const [status, setStatus] = useState('');

  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('Uploading…');
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `courses/${Date.now()}-${safe}`;
      const up = await supabase.storage.from('paid-files').upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      onChange({ ...value, file_path: path });
      setStatus('Uploaded — press Save changes to keep it.');
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-green/20 bg-green/5 p-3.5">
      <div className="mb-2 font-semibold">Private content (only buyers can open it)</div>
      <label className="label !mt-0" htmlFor="pc_video">Video ID (from Bunny Stream)</label>
      <input id="pc_video" dir="ltr" className="input" value={value.video_id} onChange={(e) => onChange({ ...value, video_id: e.target.value })} />
      <label className="label" htmlFor="pc_file">File (PDF or audio)</label>
      {value.file_path ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <code className="rounded bg-white px-2 py-1" dir="ltr">{value.file_path.split('/').pop()}</code>
          <button type="button" className="btn-outline !px-3 !py-1 !text-[13px]" onClick={() => onChange({ ...value, file_path: '' })}>Remove</button>
        </div>
      ) : (
        <input id="pc_file" type="file" accept=".pdf,audio/*" onChange={upload} aria-label="Choose the private file to upload" />
      )}
      {status && <small className="mt-1 block text-ink/60">{status}</small>}
      <small className="mt-1 block text-ink/60">
        Buyers find it under My courses. Nobody can reach it through the website address. If the course is marked free, everyone can download it.
      </small>
    </div>
  );
}
