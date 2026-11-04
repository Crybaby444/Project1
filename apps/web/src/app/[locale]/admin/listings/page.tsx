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
  const raw = (await searchParams)['page'];
  const page = Number(Array.isArray(raw) ? raw[0] : raw);
  return <ModerationQueue page={Number.isInteger(page) && page >= 1 ? page : 1} />;
}
