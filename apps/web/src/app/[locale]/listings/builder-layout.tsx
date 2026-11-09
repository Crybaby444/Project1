import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { RequireSession } from '@/lib/session/RequireSession';

export type BuilderLayoutProps = { params: Promise<{ locale: string }>; children: ReactNode };

/** The builder's tab title; never indexed. */
export async function builderMetadata(locale: string, title: 'titleNew' | 'titleEdit'): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'builder' });
  return { title: `${t(title)} · Yoyo`, robots: { index: false } };
}

/**
 * The listing builder: signed-in only (checked in the browser, see RequireSession). Used by
 * `/listings/new` and `/listings/{id}/edit`; the item page `/listings/{id}-{slug}` is public.
 */
export async function BuilderLayout({ params, children }: BuilderLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RequireSession className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8">{children}</RequireSession>;
}
