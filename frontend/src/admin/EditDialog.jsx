import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import FileField from './FileField.jsx';
import PrivateFile from './PrivateFile.jsx';
import { removeMedia } from './storage.js';
import { rowToValues, valuesToPayload } from './payload.js';
import { ConfirmDialog, Drawer, Switch } from './ui.jsx';

function Control({ f, name, value, onChange, rtl }) {
  const common = { id: `f_${name}`, name, dir: rtl ? 'rtl' : undefined, className: 'input', value, onChange: (e) => onChange(e.target.value) };
  if (f.type === 'textarea') return <textarea {...common} rows={f.tall ? 14 : 4} />;
  if (f.type === 'lines') return <textarea {...common} rows={4} />;
  if (f.type === 'pack') return <textarea {...common} rows={6} className="input font-mono text-sm" />;
  if (f.type === 'number') return <input {...common} type="number" step={f.step || '1'} />;
  if (f.type === 'datetime') return <input {...common} type="datetime-local" />;
  if (f.type === 'select') {
    return (
      <select {...common}>
        {f.options.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  }
  return <input {...common} type="text" />;
}

/** Side panel to add or edit one item. Warns before throwing away unsaved changes; Ctrl/Cmd+S saves. */
export default function EditDialog({ section, row, rows, fields, onClose, onSaved }) {
  const isNew = !row;
  const [values, setValues] = useState(() => {
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order || 0)) + 1 : 1;
    const base = row || { published: true, sort_order: nextOrder, ...section.defaults };
    return rowToValues(fields, base);
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  // workshops only: the joining link lives in a private table (visitors can never read it from the site)
  const isWorkshop = section.table === 'workshops';
  const [joinLink, setJoinLink] = useState('');
  // courses only: the private video id / file (kept in a table visitors cannot read; buyers get them after paying)
  const isCourse = section.table === 'courses';
  const [priv, setPriv] = useState({ video_id: '', file_path: '' });
  const initial = useRef(null);

  useEffect(() => {
    if (isCourse && row) {
      supabase.from('course_files').select('video_id,file_path').eq('course_id', row.id).maybeSingle().then((r) => {
        const p = { video_id: r.data?.video_id || '', file_path: r.data?.file_path || '' };
        setPriv(p);
        initial.current = JSON.stringify([values, '', p]);
      });
      return;
    }
    if (!isWorkshop || !row) { initial.current = JSON.stringify([values, '', priv]); return; }
    supabase.from('workshop_links').select('join_link').eq('workshop_id', row.id).maybeSingle().then((r) => {
      const link = r.data?.join_link || '';
      setJoinLink(link);
      initial.current = JSON.stringify([values, link, priv]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkshop, isCourse, row]);

  const dirty = initial.current !== null && JSON.stringify([values, joinLink, priv]) !== initial.current;
  const set = (k) => (v) => setValues((s) => ({ ...s, [k]: v }));

  const requestClose = useCallback(() => (dirty ? setAskDiscard(true) : onClose()), [dirty, onClose]);

  const save = useCallback(async () => {
    setErr('');
    const { payload, error } = valuesToPayload(fields, values);
    if (error) { setErr(error); return; }
    const link = joinLink.trim();
    if (isWorkshop && link && !/^https:\/\//i.test(link)) { setErr('The joining link must start with https://'); return; }
    setSaving(true);
    const table = section.table;
    let id = row?.id;
    let res;
    if (isNew) {
      res = await supabase.from(table).insert(payload).select('id').single();
      id = res.data?.id;
    } else {
      res = await supabase.from(table).update(payload).eq('id', row.id);
    }
    if (!res.error && isWorkshop && id) {
      const lr = link
        ? await supabase.from('workshop_links').upsert({ workshop_id: id, join_link: link })
        : await supabase.from('workshop_links').delete().eq('workshop_id', id);
      if (lr.error) res = lr;
    }
    if (!res.error && isCourse && id) {
      const has = priv.video_id.trim() || priv.file_path;
      const cr = has
        ? await supabase.from('course_files').upsert({ course_id: id, video_id: priv.video_id.trim() || null, file_path: priv.file_path || null })
        : await supabase.from('course_files').delete().eq('course_id', id);
      if (cr.error) res = cr;
    }
    setSaving(false);
    if (res.error) { setErr(`Could not save: ${res.error.message}`); return; }
    // files that were removed or replaced are deleted from storage now that the change is saved
    if (row) await removeMedia(fields.filter((f) => f.type === 'file' && row[f.key] && row[f.key] !== payload[f.key]).map((f) => row[f.key]));
    onSaved();
  }, [fields, values, joinLink, priv, isWorkshop, isCourse, section.table, row, isNew, onSaved]);

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saving) save(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [save, saving]);

  const names = (isNew ? 'Add' : 'Edit');
  return (
    <>
      <Drawer open onClose={requestClose} title={`${names}: ${section.singular || section.label}`}
        subtitle={isNew ? 'Fill in English, then Arabic if you have it.' : (section.title(row) || '')}
        footer={(
          <>
            <span className="me-auto text-[13px] text-ink/60">{err ? <span role="alert" className="font-semibold text-danger">{err}</span> : dirty ? 'You have unsaved changes · Ctrl+S to save' : ''}</span>
            <button type="button" className="btn-outline !py-2" onClick={requestClose}>Cancel</button>
            <button type="button" className="btn-solid !py-2" onClick={save} disabled={saving || (!isNew && !dirty)}>{saving ? 'Saving…' : isNew ? 'Add' : 'Save changes'}</button>
          </>
        )}>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="grid gap-x-6 md:grid-cols-2">
            <div className="mt-1 border-b-2 border-gold pb-0.5 font-bold text-green-2">English</div>
            <div className="mt-1 hidden border-b-2 border-gold pb-0.5 font-bold text-green-2 md:block" dir="rtl">العربية</div>
            {fields.map((f) => {
              if (f.type === 'checkbox') {
                return (
                  <div key={f.key} className="col-span-full mt-4 flex items-center justify-between gap-4 rounded-lg border border-green/15 bg-white px-4 py-3">
                    <label htmlFor={`f_${f.key}`} className="font-semibold">{f.label}</label>
                    <Switch label={f.label} checked={!!values[f.key]} onChange={set(f.key)} />
                  </div>
                );
              }
              if (f.type === 'file') {
                return (
                  <div key={f.key} className="col-span-full">
                    <label className="label" htmlFor={`f_${f.key}`}>{f.label}</label>
                    <FileField field={f} value={values[f.key]} onChange={set(f.key)} folder={section.folder} />
                  </div>
                );
              }
              if (f.ar) {
                return (
                  <div key={f.key} className="contents">
                    <div>
                      <label className="label" htmlFor={`f_${f.key}`}>{f.label}{f.required ? ' *' : ''}</label>
                      <Control f={f} name={f.key} value={values[f.key]} onChange={set(f.key)} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`f_${f.ar}`} dir="rtl">{f.arLabel || `${f.label} (Arabic)`}</label>
                      <Control f={f} name={f.ar} value={values[f.ar]} onChange={set(f.ar)} rtl />
                    </div>
                  </div>
                );
              }
              return (
                <div key={f.key} className="col-span-full">
                  <label className="label" htmlFor={`f_${f.key}`}>{f.label}</label>
                  <Control f={f} name={f.key} value={values[f.key]} onChange={set(f.key)} />
                  {f.hint && <small className="mt-1 block text-ink/60">{f.hint}</small>}
                </div>
              );
            })}
          </div>
          {isWorkshop && (
            <div className="mt-5 rounded-lg border border-green/20 bg-green/5 p-3.5">
              <label className="label !mt-0" htmlFor="f_join_link">Joining link (video call)</label>
              <input id="f_join_link" type="url" dir="ltr" className="input" placeholder="https://…" value={joinLink} onChange={(e) => setJoinLink(e.target.value)} />
              <small className="text-ink/60">Private: customers only get it 2 hours before the workshop starts (signed-in buyers on their booking page, guests by email).</small>
            </div>
          )}
          {isCourse && <PrivateFile value={priv} onChange={setPriv} />}
          <button type="submit" className="sr-only">Save</button>
        </form>
      </Drawer>
      <ConfirmDialog open={askDiscard} title="Discard your changes?" confirmLabel="Discard changes" danger
        onCancel={() => setAskDiscard(false)} onConfirm={() => { setAskDiscard(false); onClose(); }}>
        You have edits that are not saved. If you close now they will be lost.
      </ConfirmDialog>
    </>
  );
}
