import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ShopView } from '@/components/shops/ShopView';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shops' });
  return { title: `${t('pageTitle')} · Yoyo` };
}

/** A person's shop: a named collection of their items (owner, 2026-11-16). */
export default async function ShopPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <main className="page flex flex-1 flex-col page-y">
      <ShopView id={id} />
    </main>
  );
}
