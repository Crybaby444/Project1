import type { Metadata } from 'next';
import { REPORT_STATUSES, type ReportStatus } from '@yoyo/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminReports } from '@/components/admin/panel/AdminReports';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: `${t('reports.title')} · Yoyo`, robots: { index: false } };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const status = first(query['status']);
  const page = Number(first(query['page']));
  return (
    <AdminReports
      status={(REPORT_STATUSES as readonly string[]).includes(status ?? '') ? (status as ReportStatus) : 'OPEN'}
      page={Number.isInteger(page) && page >= 1 ? page : 1}
    />
  );
}
