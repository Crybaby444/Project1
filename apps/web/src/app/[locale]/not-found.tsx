import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/SiteHeader';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-6 px-4 pt-10 pb-20 sm:px-8 sm:pt-16">
        <p
          aria-hidden="true"
          className="font-display text-[clamp(96px,26vw,280px)] leading-[0.8] font-extrabold"
        >
          404
        </p>
        <h1 className="text-[clamp(28px,5vw,64px)] leading-[1.05] font-bold">{t('title')}</h1>
        <p className="max-w-[60ch] text-[17px]">{t('body')}</p>
        <Link
          href="/"
          className="inline-flex min-h-10 items-center rounded-pill border border-ink bg-cta-bg px-5 text-[14px] font-bold tracking-[0.032em] text-cta-fg"
        >
          {t('back')}
        </Link>
      </main>
    </>
  );
}
