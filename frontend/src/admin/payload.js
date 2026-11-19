import { packToText, textToPack } from './schema.js';

const pad = (n) => String(n).padStart(2, '0');

/** ISO string -> value for <input type="datetime-local"> in the viewer's time zone */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Database row -> flat form values (strings / booleans) */
export function rowToValues(fields, row) {
  const v = {};
  fields.forEach((f) => {
    if (f.type === 'pack') {
      const t = packToText(row[f.key]);
      v[f.key] = t.en;
      v[f.ar] = t.ar;
      return;
    }
    const keys = f.ar ? [f.key, f.ar] : [f.key];
    keys.forEach((k) => {
      const x = row[k];
      if (f.type === 'checkbox') v[k] = !!x;
      else if (f.type === 'lines') v[k] = Array.isArray(x) ? x.join('\n') : '';
      else if (f.type === 'datetime') v[k] = toLocalInput(x);
      else v[k] = x == null ? '' : String(x);
    });
  });
  return v;
}

/** Form values -> database payload. Returns { payload } or { error, field }. */
export function valuesToPayload(fields, values) {
  const payload = {};
  for (const f of fields) {
    if (f.type === 'pack') {
      try {
        payload[f.key] = textToPack(values[f.key], values[f.ar]);
      } catch (e) {
        return { error: e.message, field: f.key };
      }
      continue;
    }
    const keys = f.ar ? [f.key, f.ar] : [f.key];
    for (const k of keys) {
      const raw = values[k];
      let v;
      if (f.type === 'checkbox') v = !!raw;
      else if (f.type === 'number') v = raw === '' || raw == null ? 0 : Number(raw);
      else if (f.type === 'datetime') v = raw ? new Date(raw).toISOString() : null;
      else if (f.type === 'lines') v = String(raw || '').split('\n').map((x) => x.trim()).filter(Boolean);
      else v = String(raw ?? '').trim() === '' ? null : String(raw).trim();
      if (f.type === 'number' && Number.isNaN(v)) return { error: `"${f.label}" must be a number.`, field: k };
      if (f.required && k === f.key && (v == null || v === '')) return { error: `"${f.label}" is required.`, field: k };
      payload[k] = v;
    }
  }
  return { payload };
}
