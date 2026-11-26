import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NotificationList } from '@/components/notifications/NotificationList';
import { SavedSearches } from '@/components/notifications/SavedSearches';
import { PageHeader } from '@/components/ui/PageHeader';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notifications' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/** All my notifications (signed-in only, see RequireSession). */
export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('notifications');
  return (
    <main className="page-narrow page-y flex flex-1 flex-col gap-6">
      <PageHeader title={t('title')} />
      <RequireSession>
        <NotificationList />
        <SavedSearches />
      </RequireSession>
    </main>
  );
}
