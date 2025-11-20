// src/components/Turnstile.jsx
import { useEffect, useRef } from 'react';

const Turnstile = ({ onVerify, onFail }) => {
  const ref = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    const siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.error('VITE_CLOUDFLARE_TURNSTILE_SITE_KEY belum di-set');
      onFail?.(); // pastiin tombol tetap disabled
      return;
    }

    const scriptUrl =
      import.meta.env.VITE_TURNSTILE_SCRIPT_URL ||
      'https://challenges.cloudflare.com/turnstile/v0/api.js';

    const ensureScript = () =>
      new Promise((resolve) => {
        if (window.turnstile) return resolve();
        const existed = document.querySelector('script[data-turnstile]');
        if (existed) {
          // tunggu sampe window.turnstile ready
          const id = setInterval(() => {
            if (window.turnstile) {
              clearInterval(id);
              resolve();
            }
          }, 50);
          return;
        }
        const s = document.createElement('script');
        s.src = scriptUrl;
        s.async = true;
        s.defer = true;
        s.setAttribute('data-turnstile', 'true');
        s.onload = () => resolve();
        document.head.appendChild(s);
      });

    let canceled = false;

    ensureScript().then(() => {
      if (canceled) return;
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => {
          onVerify?.(token);     // PASS -> enable
        },
        'error-callback': () => {
          onFail?.();            // FAIL -> disable
        },
        'expired-callback': () => {
          onFail?.();            // EXPIRED -> disable
        },
        'timeout-callback': () => {
          onFail?.();            // TIMEOUT -> disable
        },
      });
    });

    return () => {
      canceled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onFail]);

  return <div ref={ref} />;
};

export default Turnstile;
