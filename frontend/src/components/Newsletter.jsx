import { useState } from 'react';
import { useSite } from '../hooks/SiteContext.jsx';
import { mailto } from '../lib/links.js';
import { subscribe } from '../lib/newsletter.js';

export default function Newsletter() {
  const { t, u, lang } = useSite();
  const n = t.newsletter;
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | busy | ok | invalid | error

  async function submit(e) {
    e.preventDefault();
    setState('busy');
    setState(await subscribe(email, lang));
  }

  return (
    <section className="px-5 pb-16 md:px-8">
      <div className="mx-auto max-w-[1000px] rounded-lg bg-blush/70 px-6 py-11 text-center md:px-12">
        <h2 className="mb-2.5 font-serif text-[1.9rem] font-normal text-ink">{n.title}</h2>
        <p className="mb-6 text-[15.5px] text-ink/75">{n.sub}</p>
        {state === 'ok' ? (
          <p role="status" className="font-semibold text-green">{u.subscribed}</p>
        ) : (
          <form onSubmit={submit} noValidate className="mx-auto flex max-w-[480px] flex-wrap gap-2.5">
            <label htmlFor="nl-email" className="sr-only">{n.placeholder}</label>
            <input id="nl-email" type="email" inputMode="email" autoComplete="email" value={email}
              onChange={(e) => { setEmail(e.target.value); if (state === 'invalid') setState('idle'); }}
              placeholder={n.placeholder} aria-invalid={state === 'invalid'}
              className={`min-w-[200px] flex-1 rounded-md border bg-cream px-4 py-[13px] text-[14.5px] ${state === 'invalid' ? 'border-danger' : 'border-green/20'}`} />
            <button type="submit" disabled={state === 'busy'} className="btn-solid !px-6 !py-[13px] !text-[14.5px]">{n.button}</button>
          </form>
        )}
        {state === 'invalid' && <p role="alert" className="mt-3 text-sm text-danger">{u.invalidEmail}</p>}
        {state === 'error' && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {u.subscribeError} <a href={mailto(n.title)}>{t.contact.email}</a>
          </p>
        )}
      </div>
    </section>
  );
}
