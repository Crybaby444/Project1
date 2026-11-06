import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MyDeals } from '@/components/deals/MyDeals';
import { DEAL_GROUPS, DEAL_ROLES, type DealGroup, type DealRole } from '@/lib/deals/status';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'myDeals' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** "My deals": as renter and as owner (spec §4.2, §7). Signed-in only (RequireSession). */
export default async function MyDealsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const role = first(query['role']);
  const group = first(query['group']);
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8 sm:py-14">
      <RequireSession>
        <MyDeals
          initialRole={(DEAL_ROLES as readonly string[]).includes(role ?? '') ? (role as DealRole) : 'renter'}
          initialGroup={(DEAL_GROUPS as readonly string[]).includes(group ?? '') ? (group as DealGroup) : 'open'}
        />
      </RequireSession>
    </main>
  );
}
