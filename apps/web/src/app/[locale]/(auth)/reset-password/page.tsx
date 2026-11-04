import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { firstParam, type AuthPageProps } from '../search-params';

export async function generateMetadata({ params }: AuthPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.reset' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false }, referrer: 'no-referrer' };
}

export default async function ResetPasswordPage({ params, searchParams }: AuthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ResetPasswordForm token={firstParam((await searchParams)['token'])} />;
}
