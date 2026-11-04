import { LISTING_STATUSES } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MyListings, type MyListingsFilter } from '@/components/listings/MyListings';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'myListings' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

/** "My items": signed-in only (checked in the browser, see RequireSession). */
export default async function LendingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = (await searchParams)['status'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const status: MyListingsFilter = (LISTING_STATUSES as readonly string[]).includes(value ?? '')
    ? (value as MyListingsFilter)
    : 'ALL';
  return (
    <RequireSession className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8">
      <MyListings initialStatus={status} />
    </RequireSession>
  );
}
