import type { Locale } from '@yoyo/shared';
import type { MetadataRoute } from 'next';

/** The words of the installed app, per language (the shortcuts are what people open most). */
const WORDS: Record<Locale, { name: string; description: string; catalog: string; lend: string; deals: string; messages: string }> = {
  en: {
    name: 'Yoyo — rent from people nearby',
    description: 'Rent what you need from people nearby and lend out what you rarely use, with a contract and a deposit that comes back.',
    catalog: 'Catalog',
    lend: 'Lend an item',
    deals: 'My deals',
    messages: 'Messages',
  },
  lv: {
    name: 'Yoyo — noma no cilvēkiem tuvumā',
    description: 'Nomājiet vajadzīgo no cilvēkiem tuvumā un iznomājiet to, ko lietojat reti, ar līgumu un drošības naudu, kas atgriežas.',
    catalog: 'Katalogs',
    lend: 'Izīrēt lietu',
    deals: 'Mani darījumi',
    messages: 'Ziņas',
  },
  ru: {
    name: 'Yoyo — аренда у людей рядом',
    description: 'Берите в аренду нужное у людей рядом и сдавайте то, чем пользуетесь редко, — с договором и залогом, который возвращается.',
    catalog: 'Каталог',
    lend: 'Сдать вещь',
    deals: 'Мои сделки',
    messages: 'Сообщения',
  },
};

/** Where a path of the site lives in `locale` (English has no prefix). */
const at = (locale: Locale, path: string) => (locale === 'en' ? path : `/${locale}${path === '/' ? '' : path}`);

/**
 * The web app manifest (owner, 2026-11-26: the site installable as an app). One app for every language (the
 * same `id` and scope); each language's manifest opens it, and its shortcuts, in that language.
 */
export function manifestFor(locale: Locale): MetadataRoute.Manifest {
  const w = WORDS[locale];
  return {
    id: '/',
    name: w.name,
    short_name: 'Yoyo',
    description: w.description,
    lang: locale,
    start_url: `${at(locale, '/')}?source=pwa`,
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#f4f1e6',
    theme_color: '#0a0b0e',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: w.catalog, url: at(locale, '/c'), icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: w.lend, url: at(locale, '/listings/new'), icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: w.deals, url: at(locale, '/bookings'), icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: w.messages, url: at(locale, '/messages'), icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}

/** The manifest's address for `locale`, for the page's `<link rel="manifest">`. */
export const manifestHref = (locale: Locale) => (locale === 'en' ? '/manifest.webmanifest' : `/${locale}/manifest.webmanifest`);
