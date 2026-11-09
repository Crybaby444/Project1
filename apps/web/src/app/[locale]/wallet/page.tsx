import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WalletView } from '@/components/wallet/WalletView';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'wallet' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/** The wallet (spec §4.5, §7): signed-in only (RequireSession). */
export default async function WalletPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8 sm:py-14">
      <RequireSession>
        <WalletView />
      </RequireSession>
    </main>
  );
}
