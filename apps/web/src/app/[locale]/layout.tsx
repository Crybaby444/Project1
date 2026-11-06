import { LOCALES, parseThemePreference, THEME_COOKIE, type Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { themeInitScript } from '@/components/theme/theme-script';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SyncThemeWithProfile } from '@/components/theme/use-theme-choice';
import { ToastProvider } from '@/components/ui/Toast';
import { routing } from '@/i18n/routing';
import { menuRoots } from '@/lib/catalog/menu';
import { loadCategories } from '@/lib/catalog/server-api';
import { CONTENT_LOCALE_HEADER } from '@/lib/page-headers';
import { QueryProvider } from '@/lib/session/QueryProvider';
import { SessionProvider } from '@/lib/session/SessionProvider';
import { SITE_URL } from '@/lib/site';
import { fontVariables } from '@/styles/fonts';
import '../globals.css';

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  // Relative URLs in page metadata (Open Graph images, alternates) resolve against the live site.
  return { metadataBase: new URL(SITE_URL), title: t('title'), description: t('description') };
}

export default async function LocaleLayout({ children, params }: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // An explicit choice is rendered by the server; "system" is resolved by the head script.
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  const serverTheme = preference === 'system' ? undefined : preference;
  // An item page is in the item's own language (the proxy names it); the header, the footer and the
  // page's own words keep the interface language (`lang` on them).
  const content = (await headers()).get(CONTENT_LOCALE_HEADER);
  const htmlLang = content && (LOCALES as readonly string[]).includes(content) ? (content as Locale) : locale;
  const tree = await loadCategories();
  const catalog = tree.ok ? menuRoots(tree.data) : [];

  return (
    <html lang={htmlLang} className={fontVariables} data-theme={serverTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="text-ink flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <QueryProvider>
            <SessionProvider>
              <ThemeProvider initialPreference={preference}>
                <ToastProvider>
                  <SyncThemeWithProfile />
                  <div lang={locale} className="contents">
                    <SiteHeader catalog={catalog} />
                  </div>
                  <div lang={locale} className="flex flex-1 flex-col *:w-full">
                    {children}
                  </div>
                  <div lang={locale} className="contents">
                    <SiteFooter />
                  </div>
                </ToastProvider>
              </ThemeProvider>
            </SessionProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
