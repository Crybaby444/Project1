import type { Metadata } from 'next';
import { parseThemePreference, THEME_COOKIE } from '@yoyo/shared';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { themeInitScript } from '@/components/theme/theme-script';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { routing } from '@/i18n/routing';
import { fontVariables } from '@/styles/fonts';
import '../globals.css';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  // A saved light/dark choice is rendered by the server; "system" is resolved by the inline script.
  const serverTheme = preference === 'system' ? undefined : preference;

  return (
    <html
      lang={locale}
      className={fontVariables}
      data-theme={serverTheme}
      data-theme-preference={preference}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <ThemeProvider initialPreference={preference}>
            <SiteHeader />
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
