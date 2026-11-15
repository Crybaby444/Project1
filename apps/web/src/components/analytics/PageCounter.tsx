'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { usePathname } from '@/i18n/navigation';
import { hitFor } from '@/lib/analytics/page-counter';
import { useSession } from '@/lib/session/SessionProvider';

/**
 * The site's own visit counter (owner, 2026-11-15): one small request per page, no cookie and nothing
 * about the person (the privacy policy says so). Administrators, the admin panel and automated browsers
 * are not counted. A search shown on the page (CatalogResults marks it) goes with its view.
 */
export function PageCounter() {
  const pathname = usePathname();
  const search = useSearchParams();
  const locale = useLocale();
  const { user, status } = useSession();
  const first = useRef(true);

  useEffect(() => {
    if (status === 'loading' || user?.role === 'ADMIN' || pathname.startsWith('/admin') || navigator.webdriver) return;
    // A tick later, so the new page's search marker is in the document.
    const timer = window.setTimeout(() => {
      const marker = document.querySelector<HTMLElement>('[data-search-q]');
      const q = marker?.dataset['searchQ'];
      const results = Number(marker?.dataset['searchResults']);
      const hit = hitFor({
        path: pathname,
        first: first.current,
        referrer: document.referrer,
        origin: window.location.origin,
        locale,
        ...(q && Number.isFinite(results) && { search: { q, results } }),
      });
      first.current = false;
      void fetch('/api/v1/analytics/hit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(hit),
        keepalive: true,
        credentials: 'omit',
      }).catch(() => undefined);
    }, 50);
    return () => window.clearTimeout(timer);
    // `search` re-runs it for a new query on the same page.
  }, [pathname, search, locale, status, user?.role]);

  return null;
}
