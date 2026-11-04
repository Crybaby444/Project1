import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import type { AuthPageProps } from '../search-params';

export async function generateMetadata({ params }: AuthPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.forgot' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false } };
}

export default async function ForgotPasswordPage({ params }: AuthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ForgotPasswordForm />;
}
