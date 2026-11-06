import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalDocument } from '@/components/pages/LegalDocument';
import { PRIVACY_POLICY } from '@/content/legal/privacy';
import { LEGAL_EFFECTIVE_DATE } from '@/content/legal/types';
import { pageMetadata } from '@/lib/seo';

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.privacy' });
  return pageMetadata({ locale: locale as Locale, path: '/privacy', title: t('title'), description: t('description') });
}

export default async function PrivacyPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalDocument doc={PRIVACY_POLICY[locale as Locale]} effective={LEGAL_EFFECTIVE_DATE} />;
}
