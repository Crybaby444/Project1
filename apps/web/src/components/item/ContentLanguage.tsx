'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/**
 * Keeps `<html lang>` at the item's own language while its page is open. The server already writes
 * it (the proxy tells the layout); this covers arriving by a client-side navigation, and puts the
 * interface language back on the way out.
 */
export function ContentLanguage({ lang }: { lang: string }) {
  const uiLocale = useLocale();
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    return () => {
      html.lang = uiLocale;
    };
  }, [lang, uiLocale]);
  return null;
}
