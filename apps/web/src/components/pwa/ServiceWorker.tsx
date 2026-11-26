'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (public/sw.js) once the page has loaded: the shell and static files come
 * from the cache, a page that cannot load offline shows /offline.html. Production only, and never in an
 * automated browser (the end-to-end tests drive the network themselves).
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator) || navigator.webdriver) return;
    const register = () => void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
