import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MessagesView } from '@/components/chat/MessagesView';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'chat' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/** One conversation, beside the list on wide screens (signed-in only, see RequireSession). */
export default async function ConversationPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <main className="page flex flex-1 flex-col py-6 sm:py-14">
      <RequireSession>
        <MessagesView activeId={id} />
      </RequireSession>
    </main>
  );
}
