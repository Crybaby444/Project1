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

/**
 * The settings screens: signed-in only (checked in the browser, see RequireSession). The page's grid is the
 * rail: Profile / Security / Email on the left from lg up (a segmented row above on smaller screens), the
 * sections of the open one as a column of sheets beside it.
 */
export default async function SettingsLayout({ params, children }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('settings');

  return (
    <main className="page page-y stack-page">
      <PageHeader title={t('title')} />
      <div className="layout-rail">
        <div className="lg:sticky lg:top-24">
          <SettingsTabs />
        </div>
        <div className="max-w-3xl min-w-0">
          <RequireSession>{children}</RequireSession>
        </div>
      </div>
    </main>
  );
}
