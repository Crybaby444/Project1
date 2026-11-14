import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BOOKING_STATUSES, type BookingStatus } from '@yoyo/shared';
import { AdminDeals } from '@/components/admin/panel/AdminDeals';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const pageOf = (value: string | string[] | undefined) => {
  const n = Number(first(value));
  return Number.isInteger(n) && n >= 1 ? n : 1;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: `${t('deals.title')} · Yoyo`, robots: { index: false } };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  return (
    <AdminDeals
      view={{
        disputed: first(query['view']) === 'disputes',
        status: BOOKING_STATUSES.includes(first(query['status']) as BookingStatus) ? (first(query['status']) as BookingStatus) : undefined,
        page: pageOf(query['page']),
      }}
    />
  );
}
