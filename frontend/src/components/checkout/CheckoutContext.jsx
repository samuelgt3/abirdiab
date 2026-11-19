import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSite } from '../../hooks/SiteContext.jsx';
import { DEFAULT_SETTINGS, loadSettings } from '../../lib/orders.js';
import CheckoutModal from './CheckoutModal.jsx';
import StoryModal from './StoryModal.jsx';

const Ctx = createContext(null);

/**
 * Any button on the site can open booking / checkout:
 *   const { bookSession, buyCourse, giftCourse, bookWorkshop, shareStory, settings } = useCheckout();
 */
export const useCheckout = () => useContext(Ctx);

/** Name of the currency customers are actually charged in (from Booking settings), e.g. "Egyptian pounds (EGP)". */
export function useChargeName() {
  const { u } = useSite();
  const { settings } = useCheckout();
  return u.cur[settings.payment_currency] || settings.payment_currency;
}

export function CheckoutProvider({ children }) {
  const [order, setOrder] = useState(null); // { kind, item }
  const [story, setStory] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [run, setRun] = useState(0); // remount the modal for each new checkout (fresh form)

  useEffect(() => { loadSettings().then(setSettings); }, []);

  const open = useCallback((kind, item = null) => { setOrder({ kind, item }); setRun((n) => n + 1); }, []);
  const close = useCallback(() => setOrder(null), []);

  const value = useMemo(() => ({
    settings,
    bookSession: () => open('session'),
    bookWorkshop: (w) => open('workshop', w),
    buyCourse: (c) => open('course', c),
    giftCourse: (c) => open('gift', c),
    shareStory: () => setStory(true),
  }), [open, settings]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {order && <CheckoutModal key={run} order={order} settings={settings} onClose={close} />}
      {story && <StoryModal onClose={() => setStory(false)} />}
    </Ctx.Provider>
  );
}
