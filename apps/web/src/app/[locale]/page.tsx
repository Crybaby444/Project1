import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Categories } from '@/components/landing/Categories';
import { FaqTeaser } from '@/components/landing/FaqTeaser';
import { FinalCta } from '@/components/landing/FinalCta';
import { Hero } from '@/components/landing/Hero';
import { HowRenting } from '@/components/landing/HowRenting';
import { Safety } from '@/components/landing/Safety';
import { WhatIsYoyo } from '@/components/landing/WhatIsYoyo';
import { Marquee } from '@/components/ui/Marquee';

const MARQUEE = ['one', 'two', 'three', 'four', 'five'] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');

  return (
    <main className="flex flex-1 flex-col">
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
