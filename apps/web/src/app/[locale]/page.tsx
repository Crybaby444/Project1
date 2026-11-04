import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LogoMark } from '@/components/ui/LogoMark';
import { Wordmark } from '@/components/ui/Wordmark';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <main className="mx-auto flex w-full flex-1 max-w-[1440px] flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <LogoMark size={56} />
      <h1 className="text-[clamp(5rem,20vw,12.5rem)]">
        <Wordmark />
      </h1>
      <p className="max-w-[24ch] text-2xl leading-tight font-bold text-balance">{t('tagline')}</p>
      <p className="max-w-[46ch] text-base leading-relaxed text-balance">{t('lead')}</p>
    </main>
  );
}
