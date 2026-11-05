import { getTranslations } from 'next-intl/server';
import { OG_SIZE, ogImage } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Yoyo — rent things from people nearby';

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return ogImage({ title: (await getTranslations({ locale, namespace: 'home' }))('tagline'), kicker: 'yoyo.rent' });
}
