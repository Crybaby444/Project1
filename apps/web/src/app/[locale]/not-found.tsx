import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-6 px-4 pt-16 pb-24 sm:px-8">
      <p aria-hidden="true" className="font-display text-[clamp(96px,26vw,280px)] leading-[0.8] font-extrabold">
        404
      </p>
      <h1 className="text-[clamp(24px,4vw,40px)] leading-[1.1] font-bold">{t('title')}</h1>
      <p className="max-w-[48ch] text-ink-muted">{t('body')}</p>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center rounded-full border border-ink bg-cta-bg px-5 text-sm font-bold tracking-[0.03em] text-cta-fg transition-transform duration-150 ease-yoyo hover:-translate-y-0.5 active:scale-[.97]"
      >
        {t('back')}
      </Link>
    </main>
  );
}
