import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MyShops } from '@/components/shops/MyShops';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shops' });
  return { title: `${t('mineTitle')} · Yoyo`, robots: { index: false } };
}

/** "My shops": collections of my items under a name; signed-in only. */
export default async function MyShopsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-10 sm:px-8 sm:py-14">
      <RequireSession>
        <MyShops />
      </RequireSession>
    </main>
  );
}
