import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pt-12 pb-20 sm:px-8 sm:pt-20">
      <Wordmark as="h1" className="text-[clamp(88px,24vw,320px)] break-words" />
      <p className="max-w-[22ch] text-[clamp(24px,4vw,48px)] leading-[1.1] font-bold text-balance">
        {t('tagline')}
      </p>
      <p className="text-ink-muted max-w-[60ch] text-[15px] leading-[1.5] sm:text-base">{t('lead')}</p>
    </main>
  );
}
