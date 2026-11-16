import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/panel/AdminShell';
import { RequireRole } from '@/lib/session/RequireRole';

type Props = { params: Promise<{ locale: string }>; children: ReactNode };

export const metadata: Metadata = { robots: { index: false } };

/**
 * Administrators only: anyone else sees "no access" and nothing behind it loads (the API checks too).
 * Inside, the admin panel's frame: the sections on the left, the page beside them.
 */
export default async function AdminLayout({ params, children }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="w-full px-4 sm:px-8">
      {/* The admin panel's texts are left out of the site-wide provider (i18n/client-messages.ts). */}
      <NextIntlClientProvider messages={await getMessages()}>
        <RequireRole role="ADMIN">
          <AdminShell>{children}</AdminShell>
        </RequireRole>
      </NextIntlClientProvider>
    </div>
  );
}
