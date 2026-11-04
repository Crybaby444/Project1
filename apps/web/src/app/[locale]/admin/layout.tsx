import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { RequireRole } from '@/lib/session/RequireRole';

type Props = { params: Promise<{ locale: string }>; children: ReactNode };

export const metadata: Metadata = { robots: { index: false } };

/** Administrators only: anyone else sees "no access" and nothing behind it loads (the API checks too). */
export default async function AdminLayout({ params, children }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8">
      <RequireRole role="ADMIN">{children}</RequireRole>
    </div>
  );
}
