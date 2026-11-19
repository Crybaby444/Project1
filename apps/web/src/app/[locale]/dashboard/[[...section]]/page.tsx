import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ToMyProfile } from '@/components/profile/ToMyProfile';

type Props = {
  params: Promise<{ locale: string; section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = { robots: { index: false } };

/** The old "My space" addresses (owner, 2026-11-19: everything lives in the profile now) lead there. */
const TAB_OF: Record<string, string> = { lending: 'items', favorites: 'favorites', following: 'following', shops: 'shops' };

export default async function OldDashboard({ params, searchParams }: Props) {
  const { locale, section } = await params;
  setRequestLocale(locale);
  const raw = (await searchParams)['status'];
  const status = Array.isArray(raw) ? raw[0] : raw;
  return <ToMyProfile tab={TAB_OF[section?.[0] ?? ''] ?? 'items'} {...(status && { status })} />;
}
