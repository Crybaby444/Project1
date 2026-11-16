import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Finale } from '@/components/home/Finale';
import { Hero } from '@/components/home/Hero';
import { NightScene } from '@/components/home/NightScene';
import { WhatIsYoyo } from '@/components/home/WhatIsYoyo';
import { HomeLoader } from '@/components/home/HomeLoader';
import { HomeStageLoader } from '@/components/home/HomeStageLoader';
import { PeopleScene } from '@/components/intro/PeopleScene';
import { FinePrint, sideSteps } from '@/components/intro/FinePrint';
import { Inside } from '@/components/intro/Inside';
import { TwoSides } from '@/components/intro/TwoSides';
import { pageMetadata } from '@/lib/seo';

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.whatIs' });
  return pageMetadata({
    locale: locale as Locale,
    path: '/what-is-yoyo',
    title: t('title'),
    description: t('description'),
    brand: false,
  });
}

/**
 * What is Yoyo (owner, 2026-11-16: everything once, in order, nothing repeated): the word and the yo-yo;
 * the night (take it, lend it, get it back); what Yoyo is in one sentence; both sides step by step; the
 * rules a deal keeps; the people; what else is inside; and the way home.
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
      <WhatIsYoyo />
      <TwoSides steps={await sideSteps()} />
      <FinePrint />
      <PeopleScene />
      <Inside />
      <Finale />
      <HomeStageLoader />
    </main>
  );
}
