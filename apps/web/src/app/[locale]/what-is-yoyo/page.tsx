import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Facts } from '@/components/home/Facts';
import { Finale } from '@/components/home/Finale';
import { Hero } from '@/components/home/Hero';
import { NightScene } from '@/components/home/NightScene';
import { WhatIsYoyo } from '@/components/home/WhatIsYoyo';
import { HomeLoader } from '@/components/home/HomeLoader';
import { HomeStageLoader } from '@/components/home/HomeStageLoader';
import { pageMetadata } from '@/lib/seo';

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.whatIs' });
  return pageMetadata({ locale: locale as Locale, path: '/what-is-yoyo', title: t('title'), description: t('description') });
}

/**
 * What is Yoyo (owner, 2026-11-16): the cinematic introduction that used to be the home — five scenes that
 * play on scroll and on opening. The home is now the marketplace.
 */
export default async function WhatIsYoyoPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  // v16: five scenes. As plain markup each shows its final state; the home stage (Task 6–7) plays them.
  return (
    <main data-home-root className="flex flex-1 flex-col">
      <HomeLoader />
      <div data-intro>
        <Hero />
        <NightScene />
      </div>
      <WhatIsYoyo />
      <Facts />
      <Finale />
      <HomeStageLoader />
    </main>
  );
}
