import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NotificationList } from '@/components/notifications/NotificationList';
import { SavedSearches } from '@/components/notifications/SavedSearches';
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
    <main className="page-narrow flex flex-1 flex-col gap-6 page-y">
      <h1 className="font-display text-display-l leading-[0.95] font-black uppercase">{t('title')}</h1>
      <RequireSession>
        <NotificationList />
        <SavedSearches />
      </RequireSession>
    </main>
  );
}
