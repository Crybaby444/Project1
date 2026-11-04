import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { RequireSession } from '@/lib/session/RequireSession';

type Props = { params: Promise<{ locale: string }>; children: ReactNode };

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'builder' });
  return { title: `${t('titleNew')} · Yoyo`, robots: { index: false } };
}

/** The listing builder: signed-in only (checked in the browser, see RequireSession). */
export default async function ListingsLayout({ params, children }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RequireSession className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8">{children}</RequireSession>
  );
}
