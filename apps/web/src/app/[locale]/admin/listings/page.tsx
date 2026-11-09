import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModerationQueue } from '@/components/admin/ModerationQueue';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'moderation' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

export default async function ModerationPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const page = Number(first(query['page']));
  return (
    <ModerationQueue page={Number.isInteger(page) && page >= 1 ? page : 1} queue={first(query['queue']) === 'other' ? 'other' : 'review'} />
  );
}
