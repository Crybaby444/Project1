import { LOCALES, type Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { SITE_URL } from './site';

/** Open Graph locale codes for the interface languages. */
const OG_LOCALE: Record<Locale, string> = { en: 'en_US', lv: 'lv_LV', ru: 'ru_RU' };

/** The address of `path` in `locale`: English has no prefix (`/faq`), the others do (`/lv/faq`). */
export function localizedPath(locale: Locale, path: string): string {
  if (locale === routing.defaultLocale) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** Full address of `path` in `locale`; the English home page is the bare origin, as Next.js writes it. */
export function localizedUrl(path: string, locale: Locale, siteUrl: string = SITE_URL): string {
  return `${siteUrl}${localizedPath(locale, path).replace(/^\/$/, '')}`;
}

/** Canonical address of this page in this language, and the same page in every language. */
export function alternates(path: string, locale: Locale, siteUrl: string = SITE_URL) {
  const url = (code: Locale) => localizedUrl(path, code, siteUrl);
  const languages = Object.fromEntries(LOCALES.map((code) => [code, url(code)])) as Record<Locale, string>;
  return {
    canonical: url(locale),
    languages: { ...languages, 'x-default': url(routing.defaultLocale) },
  };
}

type PageMetadataInput = {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  siteUrl?: string;
  /** Adds “ · Yoyo” to the tab title; off for a title that already names the brand. */
  brand?: boolean;
};

/** Everything a public page tells search engines and link previews. */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  siteUrl = SITE_URL,
  brand = true,
}: PageMetadataInput): Metadata {
  const links = alternates(path, locale, siteUrl);
  return {
    title: brand ? `${title} · Yoyo` : title,
    description,
    alternates: links,
    openGraph: {
      type: 'website',
      siteName: 'Yoyo',
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((code) => code !== locale).map((code) => OG_LOCALE[code]),
      url: links.canonical,
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}
