import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { displayFit } from '@/lib/display-fit';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <main className="@container mx-auto flex w-full flex-1 max-w-[1440px] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p
        aria-hidden="true"
        style={displayFit('404', { min: '3rem', max: '10rem' })}
        className="font-display text-display-fit leading-[0.8] font-black"
      >
        404
      </p>
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="max-w-[46ch] leading-relaxed">{t('body')}</p>
      <Button href="/">{t('back')}</Button>
    </main>
  );
}
