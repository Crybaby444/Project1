import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { firstParam, type AuthPageProps } from '../search-params';

export async function generateMetadata({ params }: AuthPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.login' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: AuthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  return <LoginForm next={firstParam(query['next'])} oauthError={firstParam(query['oauthError'])} />;
}
