import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { IdentityCheck } from '@/components/identity/IdentityCheck';
import { Link } from '@/i18n/navigation';
import { displayFit } from '@/lib/display-fit';
import { RequireSession } from '@/lib/session/RequireSession';
import { safeNext } from '@/lib/session/safe-next';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'identityCheck' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/**
 * Right after signing up (owner, 2026-11-16): confirm who you are now, or skip. Until a moderator has
 * confirmed it one can look around, but not lend or rent.
 */
export default async function VerifyIdentityPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('identityCheck');
  const raw = (await searchParams)['next'];
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:py-14">
      <h1 style={displayFit(t('title'), { max: '3.25rem' })} className="font-display text-display-fit leading-[0.85] font-black uppercase">
        {t('title')}
      </h1>
      <p className="text-[17px] leading-relaxed">{t('intro')}</p>
      <RequireSession>
        <IdentityCheck />
      </RequireSession>
      <Link href={next} className="self-start text-[15px] font-bold underline underline-offset-4">
        {t('skip')}
      </Link>
    </main>
  );
}
