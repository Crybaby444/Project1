import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { VerifyEmailView } from '@/components/auth/VerifyEmailView';
import { firstParam, type AuthPageProps } from '../search-params';

export async function generateMetadata({ params }: AuthPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.verify' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false }, referrer: 'no-referrer' };
}

export default async function VerifyEmailPage({ params, searchParams }: AuthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <VerifyEmailView token={firstParam((await searchParams)['token'])} />;
}
