import { Children, cloneElement, useCallback, useEffect, useRef, useState } from 'react';

const GAP = 20; // = gap-5

/**
 * One step of the endless drift (pure, so it can be tested). The row holds three copies of the cards side by side;
 * we stay in the middle copy, so when we reach the end of it the picture is identical to the start and we simply
 * step back by one copy's width: the cards go round and round, never "rewinding".
 *   pos = where we think the row is, cur = where it really is, set = width of one copy of the cards.
 */
export function loopStep(pos, dt, { set, speed, cur }) {
  const from = Math.abs(cur - pos) > 3 ? cur : pos; // the visitor moved it themselves: carry on from there
  let next = from + (speed * dt) / 1000;
  if (next >= 2 * set) next -= set;
  return next;
}

/** Keeps a manual scroll inside the middle copy, so the visitor can also keep going either way forever. */
export function wrapPos(cur, set) {
  if (cur >= 2 * set) return cur - set;
  if (cur < set) return cur + set;
  return cur;
}

const Chevron = ({ flip }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" className={flip ? 'rotate-180 rtl:rotate-0' : 'rtl:rotate-180'}><path d="M9 6l6 6-6 6" /></svg>
);

/**
 * A sideways row of cards that keeps moving slowly toward the end (right in English, left in Arabic) and goes round
 * in a loop. Previous / next buttons sit on the two sides. It stops while the visitor hovers, touches or focuses it,
 * and never moves for visitors who ask their device for reduced motion. If the cards all fit, it stays still.
 * labels = { prev, next }
 */
export default function AutoScrollRow({ children, labels, speed = 26, className = '', fullWidth = false, alwaysLoop = false }) {
  const ref = useRef(null);
  const items = Children.toArray(children);
  const n = items.length;
  const [set, setSet] = useState(0); // width of one copy of the cards; 0 = everything fits, no loop
  const [extra, setExtra] = useState(2); // how many extra copies follow the first (2 normally; more when the cards are few and the screen wide)
  const hold = useRef(false);
  const holdTimer = useRef(0);
  const setRef = useRef(0);
  setRef.current = set;

  const sign = () => (getComputedStyle(ref.current).direction === 'rtl' ? -1 : 1);

  // how wide is one copy of the cards, and do they overflow the row?
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || n === 0) return;
    // one copy's width = its cards plus the gaps (adding them up works left-to-right and right-to-left alike)
    let width = 0;
    for (let i = 0; i < n; i += 1) width += el.children[i].offsetWidth + GAP;
    // normally only rows that overflow move; with alwaysLoop, a row that fits is repeated until it fills the screen and moves too
    const next = width > el.clientWidth + GAP + 2 || (alwaysLoop && n > 1) ? Math.round(width) : 0;
    setSet((p) => (p === next ? p : next));
    setExtra(next ? Math.max(2, Math.ceil(el.clientWidth / next) + 1) : 2);
  }, [n, alwaysLoop]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure, children]);

  // the repeated copies still react to clicks, but the Tab key skips them (the first set of cards is the one keyboard users get)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (let i = n; i < el.children.length; i += 1) {
      el.children[i].querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach((x) => x.setAttribute('tabindex', '-1'));
      if (el.children[i].matches('[tabindex]')) el.children[i].setAttribute('tabindex', '-1');
    }
  });

  // start in the middle copy
  useEffect(() => {
    const el = ref.current;
    if (!el || !set) return;
    el.scrollLeft = sign() * set;
  }, [set]);

  // the endless slow drift
  useEffect(() => {
    const el = ref.current;
    if (!el || !set || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0; let last = 0; let pos = Math.abs(el.scrollLeft);
    const tick = (ts) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, ts - (last || ts)); last = ts;
      const cur = Math.abs(el.scrollLeft);
      if (hold.current || document.hidden) { pos = cur; return; }
      pos = loopStep(pos, dt, { set, speed, cur });
      el.scrollLeft = sign() * pos;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [set, speed]);

  const onScroll = () => {
    const el = ref.current;
    const s = setRef.current;
    if (!s) return;
    const cur = Math.abs(el.scrollLeft);
    const w = wrapPos(cur, s);
    if (w !== cur) el.scrollLeft = sign() * w; // identical picture, so the jump is invisible
  };

  const go = (dir) => {
    const first = ref.current.firstElementChild;
    const step = first ? first.getBoundingClientRect().width + GAP : 320;
    ref.current.scrollBy({ left: sign() * dir * step, behavior: 'smooth' });
  };
  const holdFor = (ms) => { hold.current = true; clearTimeout(holdTimer.current); holdTimer.current = setTimeout(() => { hold.current = false; }, ms); };

  const ctrl = 'absolute top-[38%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-green/25 bg-cream/95 text-green shadow-[0_6px_16px_rgba(18,63,53,.18)] backdrop-blur transition hover:bg-green hover:text-cream';
  // two more copies go round with the first; screen readers only read the first
  const copies = set ? Array.from({ length: extra }, (_, k) => k + 1).flatMap((c) => items.map((it) => cloneElement(it, { key: `${it.key}-c${c}`, 'aria-hidden': true }))) : [];
  return (
    <div className={`relative ${className}`}>
      {set > 0 && (
        <>
          <button type="button" className={`${ctrl} ${fullWidth ? 'start-2 md:start-4' : 'start-1 md:-start-5'}`} onClick={() => { holdFor(4000); go(-1); }} aria-label={labels.prev}><Chevron flip /></button>
          <button type="button" className={`${ctrl} ${fullWidth ? 'end-2 md:end-4' : 'end-1 md:-end-5'}`} onClick={() => { holdFor(4000); go(1); }} aria-label={labels.next}><Chevron /></button>
        </>
      )}
      <div ref={ref} onScroll={onScroll}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') hold.current = true; }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') hold.current = false; }}
        onTouchStart={() => holdFor(5000)} onWheel={() => holdFor(3000)}
        onFocus={() => { hold.current = true; }} onBlur={() => { hold.current = false; }}
        className={`flex gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${fullWidth ? 'px-5 md:px-8' : '-mx-1 px-1'}`}>
        {items}
        {copies}
      </div>
    </div>
  );
}
