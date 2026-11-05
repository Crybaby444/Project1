import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LogoMark } from '@/components/ui/LogoMark';
import { Wordmark } from '@/components/ui/Wordmark';
import { displayFit } from '@/lib/display-fit';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <main className="@container mx-auto flex w-full flex-1 max-w-[1440px] flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <LogoMark size={56} />
      <h1 style={displayFit('YOYO', { min: '3rem', max: '12.5rem', split: true })} className="text-display-fit">
        <Wordmark animated />
      </h1>
      <p className="max-w-[24ch] text-2xl leading-tight font-bold text-balance">{t('tagline')}</p>
      <p className="max-w-[46ch] text-base leading-relaxed text-balance">{t('lead')}</p>
    </main>
  );
}
