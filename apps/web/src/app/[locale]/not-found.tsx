import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1440px] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p aria-hidden="true" className="font-display text-[clamp(4.5rem,18vw,10rem)] leading-[0.8] font-black">
        404
      </p>
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="max-w-[46ch] leading-relaxed">{t('body')}</p>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center rounded-pill bg-cta px-5 text-[13px] font-bold tracking-[0.03em] text-cta-fg uppercase transition-transform duration-200 ease-yoyo hover:-translate-y-0.5 active:scale-[0.97]"
      >
        {t('back')}
      </Link>
    </main>
  );
}
