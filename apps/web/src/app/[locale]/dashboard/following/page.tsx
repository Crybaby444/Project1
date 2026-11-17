import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FollowingView } from '@/components/people/FollowingView';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'people' });
  return { title: `${t('feedTitle')} · Yoyo`, robots: { index: false } };
}

/** "Following": new items from the people you follow; signed-in only. */
export default async function FollowingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="page flex flex-1 flex-col page-y">
      <RequireSession>
        <FollowingView />
      </RequireSession>
    </main>
  );
}
