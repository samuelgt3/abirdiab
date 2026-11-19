import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useCheckout } from '../components/checkout/CheckoutContext.jsx';
import cartCopy from '../content/cart.json';
import { addItem, cartTotal, freeItems, paidItems, readCart, removeItem, syncCart, writeCart } from '../lib/cart.js';
import { assetUrl } from '../lib/content.js';
import { createOrder } from '../lib/orders.js';
import { useAuth } from './AuthContext.jsx';
import { useSite } from './SiteContext.jsx';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

const fill = (s, v) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, x ?? ''), s);

/**
 * The cart for courses, meditations and manuals. "Unlock full" opens a choice (add and keep browsing, or go to checkout);
 * the cart is remembered in this browser. Paid items are still paid one at a time; free items are added together.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);
  const [ui, setUi] = useState(null); // null | 'choice' | 'cart' | 'checkout'
  const [pending, setPending] = useState(null); // the course in the choice dialog
  useEffect(() => writeCart(items), [items]);
  // once the live course list is here, refresh saved prices and drop items that no longer exist
  const { content, source } = useSite();
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!content?.courses || source === 'fallback') return;
    setItems((cur) => {
      const r = syncCart(cur, content.courses);
      if (r.changed.length) setNotice(r.changed.map((c) => c.title).join(', '));
      return r.changed.length ? r.items : cur;
    });
  }, [content, source]);

  const add = useCallback((c) => setItems((cur) => addItem(cur, c)), []);
  const remove = useCallback((id) => setItems((cur) => removeItem(cur, id)), []);
  const openChoice = useCallback((course) => { setPending(course); setUi('choice'); }, []);
  const value = useMemo(() => ({
    items, count: items.length, add, remove, openChoice, openCart: () => setUi('cart'), has: (id) => items.some((x) => x.id === id),
  }), [items, add, remove, openChoice]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <CartUI ui={ui} setUi={setUi} pending={pending} items={items} add={add} remove={remove} notice={notice} clearNotice={() => setNotice('')} />
      <FloatingCart count={items.length} onOpen={() => setUi('cart')} />
    </Ctx.Provider>
  );
}

/** Lower right, on every page, once the cart has an item: opens the cart. (On phones it sits just above the "1:1 Session" button.) */
function FloatingCart({ count, onOpen }) {
  const { lang } = useSite();
  const label = `${cartCopy[lang].cartLabel}: ${count}`;
  if (count === 0) return null; // only shows once something has been added
  return (
    <button type="button" onClick={onOpen} aria-label={label} title={label}
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] end-[max(1rem,env(safe-area-inset-right))] z-[181] flex h-14 w-14 items-center justify-center rounded-full border border-green/20 bg-cream text-green shadow-[0_12px_28px_rgba(18,63,53,.28)] transition hover:-translate-y-0.5 hover:bg-white lg:bottom-6 lg:end-6">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
      </svg>
      {count > 0 && <span className="absolute -end-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent px-1.5 text-[12px] font-bold text-ink">{count}</span>}
    </button>
  );
}

function Row({ x, onRemove, c, lang, price, extra }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-green/15 bg-white p-2.5">
      {x.image_url ? <img src={assetUrl(x.image_url)} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" /> : <span className="h-14 w-14 shrink-0 rounded-md bg-green/10" />}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink">{(lang === 'ar' && x.title_ar) || x.title}</div>
        <div className="text-[13.5px] text-ink/75">{x.is_free ? c.free : price(x.price_usd)}</div>
      </div>
      {extra}
      {onRemove && <button type="button" onClick={onRemove} className="text-[13px] text-ink/75 underline underline-offset-4 hover:text-danger" aria-label={`${c.remove}: ${x.title}`}>{c.remove}</button>}
    </li>
  );
}

function CartUI({ ui, setUi, pending, items, add, remove, notice, clearNotice }) {
  const { lang, t, price } = useSite();
  const { user, name, openAuth } = useAuth();
  const { buyCourse, settings } = useCheckout();
  const navigate = useNavigate();
  const c = cartCopy[lang];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({});
  const close = () => { setUi(null); setMsg({}); };
  const closeLabel = t.testimonials.closeLbl;
  const total = cartTotal(items);
  const paid = paidItems(items);
  const free = freeItems(items);
  const priceText = (usd) => price(usd);

  async function addFree() {
    setBusy(true); setMsg({});
    const who = name || user.email.split('@')[0];
    let failed = false;
    for (const x of free) {
      const r = await createOrder({ kind: 'course', item_id: x.id, customer_name: who, email: user.email, lang });
      if (r.error) failed = true; else remove(x.id);
    }
    setBusy(false);
    setMsg(failed ? { err: c.co.error } : { ok: c.co.freeDone });
  }

  function buyOne(x) {
    close();
    buyCourse({ id: x.id, title: x.title, title_ar: x.title_ar, type: x.type, price_usd: x.price_usd, is_free: x.is_free, image_url: x.image_url });
  }

  return (
    <>
      {/* 1) Unlock full: a choice */}
      <Modal open={ui === 'choice' && !!pending} onClose={close} title={c.choiceTitle} closeLabel={closeLabel}>
        {pending && (
          <div>
            <h3 className="mb-1 font-serif text-[1.5rem] font-normal text-ink">{c.choiceTitle}</h3>
            <ul className="mb-5 mt-3 list-none p-0"><Row x={{ ...pending, is_free: !Number(pending.price_usd) || pending.is_free }} c={c} lang={lang} price={priceText} /></ul>
            <div className="flex flex-col gap-2.5">
              <button type="button" className="btn-solid w-full !py-3.5" onClick={() => { add(pending); close(); navigate('/materials'); }}>{c.addDiscover}</button>
              <button type="button" className="btn-outline w-full !py-3.5" onClick={() => { add(pending); setUi('checkout'); }}>{c.checkout}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2) the cart */}
      <Modal open={ui === 'cart'} onClose={close} title={c.title} closeLabel={closeLabel}>
        <h3 className="mb-4 font-serif text-[1.5rem] font-normal text-ink">{c.title}</h3>
        {notice && <p role="status" className="mb-3 rounded-md bg-sand p-3 text-[13.5px] text-ink/80">{c.updated.replace('{items}', notice)} <button type="button" onClick={clearNotice} className="underline underline-offset-4">OK</button></p>}
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="mb-1 mt-0 font-semibold text-ink">{c.empty}</p>
            <p className="mb-5 mt-0 text-[14px] text-ink/75">{c.emptyLead}</p>
            <Link to="/materials" onClick={close} className="btn-solid !text-cream no-underline">{c.browse}</Link>
          </div>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{items.map((x) => <Row key={x.id} x={x} c={c} lang={lang} price={priceText} onRemove={() => remove(x.id)} />)}</ul>
            <div className="mb-5 mt-4 flex items-center justify-between border-t border-green/15 pt-3">
              <span className="text-ink/70">{c.total}</span>
              <span className="font-serif text-[1.5rem] text-green">{total > 0 ? priceText(total) : c.free}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <button type="button" className="btn-solid w-full !py-3.5" onClick={() => setUi('checkout')}>{c.checkout}</button>
              <Link to="/materials" onClick={close} className="btn-outline w-full !py-3.5 text-center no-underline">{c.keep}</Link>
            </div>
          </>
        )}
      </Modal>

      {/* 3) checkout of the cart */}
      <Modal open={ui === 'checkout'} onClose={close} title={c.co.title} closeLabel={closeLabel}>
        <h3 className="mb-4 font-serif text-[1.5rem] font-normal text-ink">{c.co.title}</h3>
        {!user && !(paid.length > 0 && settings.payments_enabled) ? (
          <div>
            <p className="mb-4 mt-0 text-[15px] leading-relaxed text-ink/75">{c.co.signIn}</p>
            <button type="button" className="btn-solid w-full !py-3.5" onClick={() => openAuth({ mode: 'in' })}>{c.co.signInBtn}</button>
          </div>
        ) : items.length === 0 && !msg.ok ? (
          <p className="text-ink/70">{c.empty}</p>
        ) : (
          <div>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {items.map((x) => (
                <Row key={x.id} x={x} c={c} lang={lang} price={priceText}
                  extra={!x.is_free && items.length > 1 && settings.payments_enabled ? <button type="button" className="btn-outline !px-3 !py-1.5 !text-[13px]" onClick={() => buyOne(x)}>{c.co.buyOne}</button> : null} />
              ))}
            </ul>
            <div className="mb-4 mt-4 flex items-center justify-between border-t border-green/15 pt-3">
              <span className="text-ink/70">{c.total}</span>
              <span className="font-serif text-[1.5rem] text-green">{total > 0 ? priceText(total) : c.free}</span>
            </div>
            {paid.length > 0 && !settings.payments_enabled && <p role="status" className="mb-3 mt-0 rounded-md bg-sand p-3 text-[14px] text-ink/75">{c.co.payClosed}</p>}
            {paid.length > 1 && settings.payments_enabled && <p className="mb-3 mt-0 text-[13.5px] text-ink/75">{c.co.paidHint}</p>}
            <div className="flex flex-col gap-2.5">
              {paid.length === 1 && free.length === 0 && settings.payments_enabled && (
                <button type="button" className="btn-solid w-full !py-3.5" onClick={() => buyOne(paid[0])}>{c.co.buyOne}</button>
              )}
              {free.length > 0 && user && (
                <button type="button" disabled={busy} className={`${paid.length ? 'btn-outline' : 'btn-solid'} w-full !py-3.5`} onClick={addFree}>{paid.length ? c.co.freeOnly : c.co.freeAdd}</button>
              )}
              {free.length > 0 && !user && (
                <p className="m-0 rounded-md bg-sand p-3 text-[13.5px] text-ink/75">{c.co.freeNeedsAccount} <button type="button" className="font-semibold text-green underline underline-offset-4" onClick={() => openAuth({ mode: 'in' })}>{c.co.signInBtn}</button></p>
              )}
              <button type="button" className="text-center text-[14px] text-green underline underline-offset-4" onClick={() => setUi('cart')}>{c.co.back}</button>
            </div>
            {msg.ok && (
              <div className="mt-4 rounded-md bg-green/10 p-3 text-[14.5px] text-green">
                {msg.ok} <Link to="/account" onClick={close} className="font-semibold underline underline-offset-4">{c.co.goLearning}</Link>
              </div>
            )}
            {msg.err && <p role="alert" className="mb-0 mt-3 text-[13.5px] text-danger">{msg.err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

/** "3 items" label for the header button */
export const itemsLabel = (n, lang) => (n === 1 ? cartCopy[lang].item : fill(cartCopy[lang].items, { n }));
