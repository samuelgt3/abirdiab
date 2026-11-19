import { useState } from 'react';
import copy from '../../content/checkout.json';
import { useSite } from '../../hooks/SiteContext.jsx';
import { isEmail, submitStory } from '../../lib/orders.js';
import Modal from '../Modal.jsx';
import Field, { inputCls } from './Field.jsx';

/** "Share your story" — saved for Abir to review in the admin; never published automatically. */
export default function StoryModal({ onClose }) {
  const { lang, t, content, pick } = useSite();
  const c = copy[lang];
  const s = c.story;
  const services = [...new Set((content?.testimonials || []).map((x) => pick(x, 'role')).filter(Boolean))];
  const [f, setF] = useState({ name: '', email: '', service: '', story: '', consent: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = c.err.name;
    if (f.email.trim() && !isEmail(f.email)) er.email = c.err.email;
    if (f.story.trim().length < 10) er.story = s.short;
    if (!f.consent) er.consent = s.needConsent;
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setServerErr('');
    const res = await submitStory({ ...f, lang });
    setBusy(false);
    if (res.error) setServerErr(c.err[res.error] || c.err.generic);
    else setDone(true);
  }

  return (
    <Modal open onClose={onClose} title={s.title} closeLabel={t.testimonials.closeLbl}>
      <h3 className="mb-2 font-serif text-[1.6rem] font-normal text-ink">{s.title}</h3>
      {done ? (
        <>
          <p role="status" className="mb-6 text-[15px] text-ink/75">{s.thanks}</p>
          <button type="button" onClick={onClose} className="btn-outline w-full">{c.close}</button>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <p className="m-0 text-[14px] text-ink/75">{t.testimonials.shareLead}</p>
          <Field id="st-name" label={s.name} error={errors.name}>
            <input id="st-name" value={f.name} onChange={set('name')} className={inputCls(errors.name)} />
          </Field>
          <Field id="st-email" label={s.email} error={errors.email}>
            <input id="st-email" type="email" dir="ltr" value={f.email} onChange={set('email')} className={inputCls(errors.email)} />
          </Field>
          <Field id="st-service" label={s.service}>
            <select id="st-service" value={f.service} onChange={set('service')} className={inputCls(false)}>
              <option value="">—</option>
              {services.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field id="st-story" label={s.story} error={errors.story}>
            <textarea id="st-story" rows={5} maxLength={4000} value={f.story} onChange={set('story')} className={inputCls(errors.story)} />
          </Field>
          <div>
            <label className="flex items-start gap-2.5 text-[13.5px] text-ink/80">
              <input type="checkbox" checked={f.consent} onChange={set('consent')} className="mt-1 h-4 w-4 shrink-0" />
              {s.consent}
            </label>
            {errors.consent && <p role="alert" className="mt-1.5 text-[13px] text-danger">{errors.consent}</p>}
          </div>
          {serverErr && <p role="alert" className="text-[13.5px] text-danger">{serverErr}</p>}
          <button type="submit" disabled={busy} className="btn-solid !py-3.5">{busy ? c.saving : s.send}</button>
        </form>
      )}
    </Modal>
  );
}
