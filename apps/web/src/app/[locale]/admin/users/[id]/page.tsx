import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminPerson } from '@/components/admin/panel/AdminPerson';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: `${t('users.title')} · Yoyo`, robots: { index: false } };
}

export default async function Page({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminPerson id={id} />;
}
