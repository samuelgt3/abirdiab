import { useLanguage } from '../../context/LanguageContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCourses } from '../../context/CoursesContext.jsx';
import { useOverlay } from '../../context/OverlayContext.jsx';
import { localizeCourse } from '../../data/courses.js';
import { courseDownloadLabel } from '../../utils/courseView.js';

export default function AccountModal() {
  const { lang, L, bodyFont } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { courses } = useCourses();
  const { accountOpen, accountActions, purchaseIds, stopClick } = useOverlay();

  if (!accountOpen) return null;

  const purchases = purchaseIds
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({
      ...localizeCourse(c, lang),
      rawId: c.id,
      downloadLabel: courseDownloadLabel(c, L),
      accessLabel: c.downloadable ? (lang === 'ar' ? 'تحميل' : 'Download') : (lang === 'ar' ? 'فتح' : 'Open'),
    }));

  const handleAccessClick = (e) => {
    e.preventDefault();
    showToast(lang === 'ar' ? 'هذا رابط تجريبي فقط' : 'This is a sample link');
  };

  return (
    <div onClick={accountActions.close} style={{ position: 'fixed', inset: 0, background: 'rgba(18,63,53,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="modal-box" onClick={stopClick} style={{ background: '#FDFBF6', borderRadius: 8, maxWidth: 480, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 36, position: 'relative' }}>
        <button onClick={accountActions.close} style={{ position: 'absolute', top: 16, insetInlineEnd: 16, border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#16211D' }}>&times;</button>
        <h3 style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: '1.4rem', color: '#16211D', margin: '0 0 4px' }}>{L.account.title}</h3>
        <p style={{ fontFamily: bodyFont, fontSize: 13.5, color: 'rgba(22,33,29,.72)', margin: '0 0 22px' }}>{user ? user.email : ''}</p>
        <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: '#DD8452', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 12 }}>{L.account.myCourses}</div>
        {purchases.length === 0 && (
          <p style={{ fontFamily: bodyFont, fontSize: 14, color: 'rgba(22,33,29,.72)', marginBottom: 22 }}>{L.account.none}</p>
        )}
        {purchases.map((pc) => (
          <div key={pc.rawId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(18,63,53,.14)' }}>
            <img src={`/${pc.image}`} alt={pc.title} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Newsreader,serif', fontSize: 14.5, color: '#16211D' }}>{pc.title}</div>
              <div style={{ fontFamily: bodyFont, fontSize: 12, color: 'rgba(22,33,29,.7)' }}>{pc.downloadLabel}</div>
            </div>
            <a href="#" onClick={handleAccessClick} style={{ border: '1px solid #123F35', color: '#123F35', borderRadius: 2, padding: '8px 14px', fontFamily: bodyFont, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{pc.accessLabel}</a>
          </div>
        ))}
        <button onClick={accountActions.signOut} style={{ marginTop: 24, border: '1px solid rgba(18,63,53,.2)', background: 'none', color: '#16211D', borderRadius: 2, padding: '10px 16px', fontFamily: bodyFont, fontSize: 13, cursor: 'pointer' }}>{L.account.signOut}</button>
      </div>
    </div>
  );
}
