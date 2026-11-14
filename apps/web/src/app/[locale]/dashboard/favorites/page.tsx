import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FavoritesList } from '@/components/favorites/FavoritesList';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'favorites' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/** "Favourites": signed-in only (checked in the browser, see RequireSession). */
export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-10 sm:px-8 sm:py-14">
      <RequireSession>
        <FavoritesList />
      </RequireSession>
    </main>
  );
}
