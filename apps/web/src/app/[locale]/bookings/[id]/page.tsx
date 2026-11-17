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
    <main className="page page-y">
      <RequireSession>
        <DealView id={id} />
      </RequireSession>
    </main>
  );
}
