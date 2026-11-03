import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { parseThemePreference, THEME_COOKIE } from '@yoyo/shared';
import { themeInitScript } from '@/components/theme/theme-script';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { routing } from '@/i18n/routing';
import { fontVariables } from '@/styles/fonts';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('title'), description: t('description') };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // An explicit choice is rendered by the server; "system" is resolved by the inline script.
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  const serverTheme = preference === 'system' ? undefined : preference;

  return (
    <html lang={locale} className={fontVariables} data-theme={serverTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-canvas text-ink antialiased">
        <ThemeProvider initialPreference={preference}>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
