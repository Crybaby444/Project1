import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Categories } from '@/components/landing/Categories';
import { FaqTeaser } from '@/components/landing/FaqTeaser';
import { FinalCta } from '@/components/landing/FinalCta';
import { Hero } from '@/components/landing/Hero';
import { HowRenting } from '@/components/landing/HowRenting';
import { Safety } from '@/components/landing/Safety';
import { WhatIsYoyo } from '@/components/landing/WhatIsYoyo';
import { JsonLd } from '@/components/seo/JsonLd';
import { Marquee } from '@/components/ui/Marquee';
import { pageMetadata } from '@/lib/seo';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

const MARQUEE = ['one', 'two', 'three', 'four', 'five'] as const;

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.home' });
  return pageMetadata({ locale: locale as Locale, path: '/', title: t('title'), description: t('description'), brand: false });
}

/** Who runs the site and what it is, for search engines (schema.org). */
function structuredData(description: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Yoyo',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon.svg`,
      email: CONTACT_EMAIL,
      areaServed: ['LV', 'EE', 'LT'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Yoyo',
      url: `${SITE_URL}/`,
      description,
      inLanguage: ['en', 'lv', 'ru'],
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ];
}

export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const meta = await getTranslations('pages.home');

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={structuredData(meta('description'))} />
      <Hero />
      <Marquee items={MARQUEE.map((key) => t(`marquee.${key}`))} />
      <WhatIsYoyo />
      <HowRenting />
      <Safety />
      <Categories />
      <FaqTeaser />
      <FinalCta />
    </main>
  );
}
