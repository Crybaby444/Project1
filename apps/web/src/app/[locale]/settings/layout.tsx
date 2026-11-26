import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { PageHeader } from '@/components/ui/PageHeader';
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
    <main className="page-narrow page-y @container flex flex-col gap-6">
      <PageHeader title={t('title')} />
      <SettingsTabs />
      <RequireSession>{children}</RequireSession>
    </main>
  );
}
