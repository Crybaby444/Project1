import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { Wordmark } from '@/components/ui/Wordmark';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pt-10 pb-20 sm:px-8 sm:pt-16">
        <h1 className="text-[clamp(88px,24vw,320px)] leading-[0.8]">
          <Wordmark />
        </h1>
        <p className="max-w-[18ch] text-[clamp(28px,5vw,64px)] leading-[1.05] font-bold tracking-[-0.01em]">
          {t('tagline')}
        </p>
        <p className="max-w-[60ch] text-[17px] leading-[1.5]">{t('lead')}</p>
      </main>
    </>
  );
}
