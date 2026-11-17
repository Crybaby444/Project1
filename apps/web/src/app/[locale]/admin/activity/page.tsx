import type { Metadata } from 'next';
import { ACTIVITY_GROUPS, type ActivityGroup } from '@yoyo/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminActivity } from '@/components/admin/panel/AdminActivity';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: `${t('nav.activity')} · Yoyo`, robots: { index: false } };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const group = first(query['group']);
  const user = first(query['user']);
  return (
    <AdminActivity
      {...(group && group in ACTIVITY_GROUPS && { group: group as ActivityGroup })}
      {...(user && /^[\w-]{1,40}$/.test(user) && { userId: user })}
    />
  );
}
