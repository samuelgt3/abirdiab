import { useLanguage } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Toast() {
  const { bodyFont } = useLanguage();
  const { toast } = useToast();
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', bottom: 28, insetInlineStart: '50%', transform: 'translateX(-50%)', background: '#123F35', color: '#FDFBF6', padding: '14px 24px', borderRadius: 4, fontFamily: bodyFont, fontSize: 14, zIndex: 1000, boxShadow: '0 12px 32px rgba(0,0,0,.25)' }}>
      {toast}
    </div>
  );
}
