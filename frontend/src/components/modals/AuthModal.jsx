import { useLanguage } from '../../context/LanguageContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';

export default function AuthModal() {
  const { lang, L, bodyFont } = useLanguage();
  const { showToast } = useToast();
  const { auth, authActions, stopClick } = useOverlay();

  if (!auth.open) return null;

  const isSignup = auth.mode === 'signup';
  const title = isSignup ? (lang === 'ar' ? 'إنشاء حساب' : 'Create account') : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign in');
  const disabled = !(auth.email && auth.password && (auth.mode === 'signin' || auth.name));
  const submitLabel = isSignup ? (lang === 'ar' ? 'إنشاء الحساب' : 'Create account') : (lang === 'ar' ? 'دخول' : 'Sign in');
  const switchPrompt = isSignup ? (lang === 'ar' ? 'لديك حساب؟' : 'Already have an account?') : (lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?");
  const switchLabel = isSignup ? (lang === 'ar' ? 'دخول' : 'Sign in') : (lang === 'ar' ? 'إنشاء حساب' : 'Sign up');

  return (
    <div onClick={authActions.close} style={{ position: 'fixed', inset: 0, background: 'rgba(18,63,53,.6)', zIndex: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="modal-box" onClick={stopClick} style={{ background: '#FDFBF6', borderRadius: 8, maxWidth: 380, width: '100%', padding: 36, position: 'relative' }}>
        <button onClick={authActions.close} style={{ position: 'absolute', top: 16, insetInlineEnd: 16, border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#16211D' }}>&times;</button>
        <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.4rem', color: '#16211D', margin: '0 0 6px' }}>{title}</h3>
        <p style={{ fontFamily: bodyFont, fontSize: 13, color: 'rgba(22,33,29,.72)', margin: '0 0 22px' }}>{L.auth.note}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          {isSignup && (
            <input value={auth.name} onChange={authActions.setName} placeholder={L.auth.namePh} style={{ border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
          )}
          <input value={auth.email} onChange={authActions.setEmail} placeholder={L.auth.emailPh} type="email" style={{ border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
          <input value={auth.password} onChange={authActions.setPassword} placeholder={L.auth.passwordPh} type="password" style={{ border: '1px solid rgba(18,63,53,.2)', borderRadius: 4, padding: '12px 14px', fontFamily: bodyFont, fontSize: 14 }} />
        </div>
        <button onClick={() => authActions.submit(showToast)} disabled={disabled} style={{ width: '100%', background: '#123F35', color: '#FDFBF6', border: 'none', borderRadius: 2, padding: 14, fontFamily: bodyFont, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', opacity: disabled ? .5 : 1, marginBottom: 14 }}>{submitLabel}</button>
        <div style={{ textAlign: 'center', fontFamily: bodyFont, fontSize: 13, color: 'rgba(22,33,29,.72)' }}>
          {switchPrompt} <span onClick={authActions.switchMode} style={{ color: '#123F35', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>{switchLabel}</span>
        </div>
      </div>
    </div>
  );
}
