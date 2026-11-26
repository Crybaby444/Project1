import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { IdentityCheck } from '@/components/identity/IdentityCheck';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
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
    <main className="page page-y stack-page">
      <PageHeader title={t('title')} intro={t('intro')} />
      <div className="flex max-w-3xl flex-col items-start gap-6">
        <RequireSession>
          <IdentityCheck />
        </RequireSession>
        <Link href={next} className="text-base font-bold underline underline-offset-4">
          {t('skip')}
        </Link>
      </div>
    </main>
  );
}
