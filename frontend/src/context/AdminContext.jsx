import { createContext, useCallback, useContext, useState } from 'react';
import { useLanguage } from './LanguageContext.jsx';
import { useToast } from './ToastContext.jsx';

const AdminContext = createContext(null);

/** Footer "Site admin" toggle from the original design: a client-side-only
 * password prompt gating inline editing of testimonials/courses. This is a
 * sample affordance, not real auth — a production build should replace this
 * with a real authenticated admin check against the backend. */
export function AdminProvider({ children }) {
  const [manageMode, setManageMode] = useState(false);
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const toggleManage = useCallback(() => {
    if (manageMode) {
      setManageMode(false);
      return;
    }
    const pw = window.prompt(lang === 'ar' ? 'كلمة مرور الإدارة' : 'Admin password');
    if (pw === 'abir2026') setManageMode(true);
    else if (pw !== null) showToast(lang === 'ar' ? 'كلمة مرور غير صحيحة' : 'Incorrect password');
  }, [manageMode, lang, showToast]);

  return (
    <AdminContext.Provider value={{ manageMode, toggleManage }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within an AdminProvider');
  return ctx;
}
