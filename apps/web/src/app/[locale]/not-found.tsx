import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1440px] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p aria-hidden="true" className="font-display text-[clamp(4.5rem,18vw,10rem)] leading-[0.8] font-black">
        404
      </p>
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="max-w-[46ch] leading-relaxed">{t('body')}</p>
      <Button href="/">{t('back')}</Button>
    </main>
  );
}
