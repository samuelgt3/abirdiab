import { useState } from 'react';
import copy from '../content/account.json';
import { useSite } from '../hooks/SiteContext.jsx';
import AuthForm from './AuthForm.jsx';
import Modal from './Modal.jsx';

/** Sign in / create account in a window. `onSuccess` runs after a sign-in that signs the visitor straight in (Google returns to the page after its redirect). */
export default function AuthModal({ mode: initial = 'in', onSuccess, onClose, prefill, intro }) {
  const { lang, t } = useSite();
  const a = copy[lang].auth;
  const [mode, setMode] = useState(initial);
  const up = mode === 'up';
  return (
    <Modal open onClose={onClose} title={up ? a.titleUp : a.titleIn} closeLabel={t.testimonials.closeLbl}>
      <h3 className="mb-1 font-serif text-[1.6rem] font-normal text-ink">{up ? a.titleUp : a.titleIn}</h3>
      <AuthForm mode={initial} onMode={setMode} prefill={prefill} intro={intro} onLinkClick={onClose} onSignedIn={() => { onClose(); onSuccess?.(); }} />
    </Modal>
  );
}
