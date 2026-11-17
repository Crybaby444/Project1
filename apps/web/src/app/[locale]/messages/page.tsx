import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MessagesView } from '@/components/chat/MessagesView';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'chat' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/** "Messages": signed-in only (checked in the browser, see RequireSession). */
export default async function MessagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="page flex flex-1 flex-col page-y">
      <RequireSession>
        <MessagesView />
      </RequireSession>
    </main>
  );
}
