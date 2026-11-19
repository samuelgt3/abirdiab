import { useEffect, useRef, useState } from 'react';

// Paymob's embedded card form ("Pixel"). Version is pinned so a Paymob release cannot change checkout unexpectedly;
// re-check the options against https://developers.paymob.com (checkout-experiences/pixel-embedded) before bumping.
const VERSION = '1.2.10';
const CDN = `https://cdn.jsdelivr.net/npm/paymob-pixel@${VERSION}`;
const LOAD_TIMEOUT_MS = 15000;

let loader; // load the script and styles once per page
function loadPixel() {
  if (typeof window !== 'undefined' && window.Pixel) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    ['styles.css', 'main.css'].forEach((f) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = `${CDN}/${f}`;
      document.head.appendChild(l);
    });
    const s = document.createElement('script');
    s.type = 'module';
    s.src = `${CDN}/main.js`;
    s.onerror = () => { loader = undefined; reject(new Error('pixel script failed')); };
    document.head.appendChild(s);
    const t0 = Date.now();
    const poll = setInterval(() => {
      if (window.Pixel) { clearInterval(poll); resolve(); }
      else if (Date.now() - t0 > LOAD_TIMEOUT_MS) { clearInterval(poll); loader = undefined; reject(new Error('pixel timeout')); }
    }, 100);
  });
  return loader;
}

/**
 * The card form, shown inside our own page. Card details are typed into Paymob's component (their iframe/fields),
 * never into our code. `onSubmitted` only drives the UI: the order is marked paid by Paymob's signed webhook.
 */
export default function PaymobPixel({ publicKey, clientSecret, lang, onSubmitted, onFailed }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const cb = useRef({ onSubmitted, onFailed });
  cb.current = { onSubmitted, onFailed };

  useEffect(() => {
    let alive = true;
    const host = ref.current;
    loadPixel()
      .then(() => {
        if (!alive || !host) return;
        new window.Pixel({
          publicKey,
          clientSecret,
          paymentMethods: ['card'],
          elementId: 'paymob-elements',
          disablePay: false,
          showSaveCard: false,
          forceSaveCard: false,
          afterPaymentComplete: () => cb.current.onSubmitted?.(),
          customStyle: {
            Font_Family: lang === 'ar' ? 'Almarai' : 'DM Sans',
            Color_Primary: '#123F35',
            Radius_Border: '8',
            ...(lang === 'ar' ? { Direction: 'rtl' } : {}),
          },
        });
        setReady(true);
      })
      .catch(() => alive && cb.current.onFailed?.());
    return () => {
      alive = false;
      if (host) host.innerHTML = '';
    };
  }, [publicKey, clientSecret, lang]);

  return (
    <div>
      {!ready && <div className="h-24 animate-pulse rounded-lg bg-sand" aria-hidden="true" />}
      <div id="paymob-elements" ref={ref} dir={lang === 'ar' ? 'rtl' : 'ltr'} />
    </div>
  );
}
