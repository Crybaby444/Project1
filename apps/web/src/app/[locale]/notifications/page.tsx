import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NotificationList } from '@/components/notifications/NotificationList';
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] font-black uppercase">{t('title')}</h1>
      <RequireSession>
        <NotificationList />
      </RequireSession>
    </main>
  );
}
