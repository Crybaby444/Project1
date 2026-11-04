import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { firstParam, type AuthPageProps } from '../search-params';

export async function generateMetadata({ params }: AuthPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.register' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

export default async function RegisterPage({ params, searchParams }: AuthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RegisterForm next={firstParam((await searchParams)['next'])} />;
}
