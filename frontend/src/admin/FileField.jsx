import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { assetUrl } from '../lib/content.js';

/**
 * URL box + uploader that stores the file in the public `media` bucket.
 * "Remove" empties the field; the stored file itself is deleted when the item is saved (so Cancel keeps everything).
 */
export default function FileField({ field, value, onChange, folder }) {
  const [status, setStatus] = useState('');
  const isImage = field.accept?.startsWith('image') && value;
  const isAudio = field.accept?.startsWith('audio') && value;

  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('Uploading…');
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${folder}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from('media').upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      onChange(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
      setStatus('Uploaded — press Save to keep it.');
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
    }
    e.target.value = '';
  }

  return (
    <div>
      <input id={`f_${field.key}`} type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Paste a link, or upload a file below" className="input" />
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
        <input type="file" accept={field.accept || ''} onChange={upload} aria-label={`Choose file to upload for ${field.label}`} />
        {value && (
          <button type="button" className="btn-outline !px-3 !py-1 !text-[13px] !text-danger"
            onClick={() => { onChange(''); setStatus('Removed — press Save and the file is deleted.'); }}>Remove</button>
        )}
        <small className="text-ink/60">{status}</small>
      </div>
      {isImage && <img src={assetUrl(value)} alt="Preview" className="mt-2 block max-h-[70px] rounded border border-green/15" />}
      {isAudio && <audio controls preload="none" src={assetUrl(value)} className="mt-2 block h-9 w-full max-w-[420px]" />}
    </div>
  );
}
