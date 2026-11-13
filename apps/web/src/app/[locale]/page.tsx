import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Facts } from '@/components/home/Facts';
import { Finale } from '@/components/home/Finale';
import { Hero } from '@/components/home/Hero';
import { NightScene } from '@/components/home/NightScene';
import { WhatIsYoyo } from '@/components/home/WhatIsYoyo';
import { JsonLd } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/seo';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

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
  const meta = await getTranslations('pages.home');

  // v16: five scenes. As plain markup each shows its final state; the home stage (Task 6–7) plays them.
  return (
    <main data-home-root className="flex flex-1 flex-col">
      <JsonLd data={structuredData(meta('description'))} />
      <Hero />
      <NightScene />
      <WhatIsYoyo />
      <Facts />
      <Finale />
    </main>
  );
}
