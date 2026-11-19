import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AuthModal from '../components/AuthModal.jsx';
import { claimMyOrders } from '../lib/orders.js';
import { supabase } from '../lib/supabase.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

/** Customer accounts (Supabase Auth: email + password, Google). The admin signs in through the same system at /admin. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [modal, setModal] = useState(null); // { mode, onSuccess }

  useEffect(() => {
    if (!supabase) { setSession(null); return undefined; }
    supabase.auth.getSession().then((r) => setSession(r.data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const openAuth = useCallback((opts = {}) => setModal({ mode: 'in', ...opts }), []);
  const close = useCallback(() => setModal(null), []);
  const signOut = useCallback(() => supabase?.auth.signOut(), []);

  const user = session?.user || null;
  // purchases made earlier as a guest (same confirmed email) show up in this member's account as soon as they sign in
  const uid = user?.id;
  const confirmed = !!user?.email_confirmed_at;
  const [claimTick, setClaimTick] = useState(0); // goes up when earlier purchases have just been attached, so "My bookings" reloads
  useEffect(() => {
    if (uid) claimMyOrders().then((n) => { if (n > 0) setClaimTick((x) => x + 1); });
  }, [uid, confirmed]);
  const value = useMemo(() => ({
    user,
    ready: session !== undefined,
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    phone: user?.user_metadata?.phone || '',
    phoneDial: user?.user_metadata?.phone_dial || '',
    countryCode: user?.user_metadata?.country || '',
    claimTick,
    openAuth,
    signOut,
  }), [user, session, claimTick, openAuth, signOut]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {modal && <AuthModal mode={modal.mode} onSuccess={modal.onSuccess} prefill={modal.prefill} intro={modal.intro} onClose={close} />}
    </Ctx.Provider>
  );
}
