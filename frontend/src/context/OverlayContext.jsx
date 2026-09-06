import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLanguage } from './LanguageContext.jsx';
import { useAuth } from './AuthContext.jsx';
import { useCart } from './CartContext.jsx';
import { useCourses } from './CoursesContext.jsx';
import * as purchasesApi from '../api/purchases.js';
import { completeCheckout } from '../api/checkout.js';

const OverlayContext = createContext(null);

const BOOKING_DEFAULT = { open: false, step: 1, context: '', date: null, time: null, name: '', phone: '', email: '' };
const CHECKOUT_DEFAULT = { open: false, stage: 'review', card: '', expiry: '', cvv: '' };
const AUTH_DEFAULT = { open: false, mode: 'signin', purpose: 'account', name: '', email: '', password: '' };

function pushHash(hash) {
  try { history.pushState({ om: hash }, '', '#' + hash); } catch { /* ignore */ }
}
function popHash() {
  try {
    if ((location.hash || '').length > 1) { history.back(); return true; }
  } catch { /* ignore */ }
  return false;
}

export function OverlayProvider({ children }) {
  const { lang } = useLanguage();
  const { user, signIn, signUp, signOut } = useAuth();
  const { cart, clearCart } = useCart();
  const { courses } = useCourses();

  const [menuOpen, setMenuOpen] = useState(false);
  const [coursesDropOpen, setCoursesDropOpen] = useState(false);
  const [activeJournalIndex, setActiveJournalIndex] = useState(-1);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [lmsOpen, setLmsOpen] = useState(false);
  const [lmsType, setLmsType] = useState('All');
  const [lmsFree, setLmsFree] = useState('All');
  const [booking, setBooking] = useState(BOOKING_DEFAULT);
  const [checkout, setCheckout] = useState(CHECKOUT_DEFAULT);
  const [auth, setAuth] = useState(AUTH_DEFAULT);
  const [accountOpen, setAccountOpen] = useState(false);
  const [purchaseIds, setPurchaseIds] = useState([]);

  const refreshPurchases = useCallback(() => {
    if (!user) { setPurchaseIds([]); return; }
    purchasesApi.getPurchases(user.email).then(setPurchaseIds);
  }, [user]);

  useEffect(() => { refreshPurchases(); }, [refreshPurchases]);

  // Deep-link / reload support + browser back button, matching the
  // original's componentDidMount + popstate handling.
  const didInit = useRef(false);
  useEffect(() => {
    const onPop = () => {
      setLmsOpen(false);
      setActiveJournalIndex(-1);
      setActiveCourseId(null);
      setLmsType('All');
      setLmsFree('All');
    };
    window.addEventListener('popstate', onPop);
    if (!didInit.current) {
      didInit.current = true;
      const h = (location.hash || '').replace('#', '');
      if (h === 'library-all' || h === 'courses-all') setLmsOpen(true);
      else if (h.startsWith('journal-')) {
        const idx = parseInt(h.split('-')[1], 10) - 1;
        if (!isNaN(idx)) setActiveJournalIndex(idx);
      }
    }
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const toggleMenu = useCallback(() => { setMenuOpen((v) => !v); setCoursesDropOpen(false); }, []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleCoursesDrop = useCallback(() => setCoursesDropOpen((v) => !v), []);

  const openJournal = useCallback((index) => { pushHash('journal-' + (index + 1)); setActiveJournalIndex(index); }, []);
  const closeJournal = useCallback(() => { if (!popHash()) setActiveJournalIndex(-1); }, []);

  const openCourse = useCallback((id) => setActiveCourseId(id), []);
  const closeCourse = useCallback(() => setActiveCourseId(null), []);

  const openLms = useCallback(() => { pushHash('courses-all'); setLmsOpen(true); }, []);
  const openLmsClick = useCallback((e) => { e.preventDefault(); pushHash('courses-all'); setLmsOpen(true); }, []);
  const goCourses = useCallback((type) => (e) => {
    e.preventDefault();
    pushHash('courses-all');
    setLmsOpen(true);
    setLmsType(type);
  }, []);
  const closeLms = useCallback(() => { if (!popHash()) setLmsOpen(false); }, []);

  const openBooking = useCallback((context) => {
    setBooking({ ...BOOKING_DEFAULT, open: true, context });
  }, []);
  const closeBooking = useCallback(() => setBooking(BOOKING_DEFAULT), []);
  const bookingActions = {
    setDate: (e) => setBooking((s) => ({ ...s, date: e.target.value })),
    selectTime: (t) => setBooking((s) => ({ ...s, time: t })),
    toStep2: () => setBooking((s) => (s.date && s.time ? { ...s, step: 2 } : s)),
    setName: (e) => setBooking((s) => ({ ...s, name: e.target.value })),
    setPhone: (e) => setBooking((s) => ({ ...s, phone: e.target.value })),
    setEmail: (e) => setBooking((s) => ({ ...s, email: e.target.value })),
    back: () => setBooking((s) => ({ ...s, step: 1 })),
    confirm: () => setBooking((s) => (s.name && s.phone ? { ...s, step: 3 } : s)),
    close: closeBooking,
  };

  const openCart = useCallback(() => setCheckout((s) => ({ ...s, open: true, stage: 'review' })), []);
  const closeCheckout = useCallback(() => setCheckout(CHECKOUT_DEFAULT), []);
  const checkoutActions = {
    setCard: (e) => setCheckout((s) => ({ ...s, card: e.target.value })),
    setExpiry: (e) => setCheckout((s) => ({ ...s, expiry: e.target.value })),
    setCvv: (e) => setCheckout((s) => ({ ...s, cvv: e.target.value })),
    proceed: () => {
      if (user) setCheckout((s) => ({ ...s, stage: 'payment' }));
      else setAuth({ ...AUTH_DEFAULT, open: true, purpose: 'checkout' });
    },
    pay: async () => {
      const email = user ? user.email : null;
      await completeCheckout({ email, courseIds: cart });
      clearCart();
      setCheckout((s) => ({ ...s, stage: 'success' }));
      refreshPurchases();
    },
    goToAccount: () => { setCheckout(CHECKOUT_DEFAULT); setAccountOpen(true); },
    close: closeCheckout,
  };

  const openAuth = useCallback((purpose = 'account') => {
    setAuth({ ...AUTH_DEFAULT, open: true, purpose });
  }, []);
  const closeAuth = useCallback(() => setAuth(AUTH_DEFAULT), []);
  const authActions = {
    setName: (e) => setAuth((s) => ({ ...s, name: e.target.value })),
    setEmail: (e) => setAuth((s) => ({ ...s, email: e.target.value })),
    setPassword: (e) => setAuth((s) => ({ ...s, password: e.target.value })),
    switchMode: () => setAuth((s) => ({ ...s, mode: s.mode === 'signup' ? 'signin' : 'signup' })),
    submit: async (showToast) => {
      if (!(auth.email && auth.password && (auth.mode === 'signin' || auth.name))) return;
      if (auth.mode === 'signup') await signUp(auth.name, auth.email, auth.password);
      else await signIn(auth.email, auth.password);
      const purpose = auth.purpose;
      setAuth(AUTH_DEFAULT);
      if (purpose === 'checkout') setCheckout((s) => ({ ...s, open: true, stage: 'payment' }));
      else showToast?.(lang === 'ar' ? 'تم تسجيل الدخول' : 'Signed in');
    },
    close: closeAuth,
  };

  const closeAccount = useCallback(() => setAccountOpen(false), []);
  const accountActions = {
    open: () => setAccountOpen(true),
    close: closeAccount,
    signOut: async () => { await signOut(); setAccountOpen(false); },
  };

  const stopClick = useCallback((e) => e.stopPropagation(), []);

  const value = {
    menuOpen, toggleMenu, closeMenu,
    coursesDropOpen, toggleCoursesDrop,
    activeJournalIndex, openJournal, closeJournal,
    activeCourseId, openCourse, closeCourse,
    lmsOpen, lmsType, lmsFree, setLmsType, setLmsFree, openLms, openLmsClick, goCourses, closeLms,
    booking, bookingActions, openBooking,
    checkout, checkoutActions, openCart,
    auth, authActions, openAuth,
    accountOpen, accountActions, purchaseIds,
    courses,
    stopClick,
  };

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within an OverlayProvider');
  return ctx;
}
