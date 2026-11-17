import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { displayFit } from '@/lib/display-fit';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <main className="page @container flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <p
        aria-hidden="true"
        style={displayFit('404', { min: '3rem', max: '10rem' })}
        className="font-display text-display-fit leading-[0.8] font-black"
      >
        404
      </p>
      <h1 className="font-display text-display-l leading-[0.95] font-black uppercase hyphens-auto [overflow-wrap:anywhere]">{t('title')}</h1>
      <p className="max-w-lead leading-relaxed">{t('body')}</p>
      <Button href="/">{t('back')}</Button>
    </main>
  );
}
