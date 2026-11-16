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
import { PeopleScene } from '@/components/intro/PeopleScene';
import { Inside } from '@/components/intro/Inside';
import { TwoEnds } from '@/components/intro/TwoEnds';
import { TwoSides } from '@/components/intro/TwoSides';
import { pageMetadata } from '@/lib/seo';

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.whatIs' });
  return pageMetadata({ locale: locale as Locale, path: '/what-is-yoyo', title: t('title'), description: t('description') });
}

/**
 * What is Yoyo (owner, 2026-11-16): the introduction to the whole idea. The yo-yo drops in, the night spills
 * out (take it, lend it, get it back), the two ends of one string (who needs, who has, Yoyo in the middle),
 * the steps of a deal, both sides in full (renting and lending), the people, everything inside (profiles, shops, messages), the rules in numbers, and the finale.
 */
export default async function WhatIsYoyoPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main data-home-root className="flex flex-1 flex-col">
      <HomeLoader />
      <div data-intro>
        <Hero />
        <NightScene />
      </div>
      <TwoEnds />
      <WhatIsYoyo />
      <TwoSides />
      <PeopleScene />
      <Inside />
      <Facts />
      <Finale />
      <HomeStageLoader />
    </main>
  );
}
