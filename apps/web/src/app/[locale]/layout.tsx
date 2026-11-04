import { parseThemePreference, THEME_COOKIE } from '@yoyo/shared';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { themeInitScript } from '@/components/theme/theme-script';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { routing } from '@/i18n/routing';
import { QueryProvider } from '@/lib/session/QueryProvider';
import { SessionProvider } from '@/lib/session/SessionProvider';
import { fontVariables } from '@/styles/fonts';
import '../globals.css';

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('title'), description: t('description') };
}

export default async function LocaleLayout({ children, params }: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // An explicit choice is rendered by the server; "system" is resolved by the head script.
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  const serverTheme = preference === 'system' ? undefined : preference;

  return (
    <html lang={locale} className={fontVariables} data-theme={serverTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-canvas text-ink min-h-dvh">
        <NextIntlClientProvider>
          <QueryProvider>
            <SessionProvider>
              <ThemeProvider initialPreference={preference}>
                <div className="fixed top-4 right-4 z-50">
                  <ThemeToggle />
                </div>
                {children}
              </ThemeProvider>
            </SessionProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
