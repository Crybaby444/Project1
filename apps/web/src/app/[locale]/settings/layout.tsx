import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { displayFit } from '@/lib/display-fit';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string }>; children: ReactNode };

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/** The settings screens: signed-in only (checked in the browser, see RequireSession), with tabs. */
export default async function SettingsLayout({ params, children }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('settings');

  return (
    <main className="@container mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
      <h1
        style={displayFit(t('title'), { max: '3.25rem' })}
        className="font-display text-display-fit leading-[0.85] font-black uppercase"
      >
        {t('title')}
      </h1>
      <SettingsTabs />
      <RequireSession>{children}</RequireSession>
    </main>
  );
}
