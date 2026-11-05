import { getTranslations } from 'next-intl/server';
import { OG_SIZE, ogImage } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Yoyo terms of service';

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.terms' });
  return ogImage({ title: t('title'), kicker: 'yoyo.rent' });
}
