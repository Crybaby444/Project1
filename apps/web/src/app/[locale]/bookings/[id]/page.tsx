import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DealView } from '@/components/deals/DealView';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'myDeals' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/** One deal with all its steps (spec §7): its sides and administrators only (checked by the API). */
export default async function DealPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8 sm:py-14">
      <RequireSession>
        <DealView id={id} />
      </RequireSession>
    </main>
  );
}
