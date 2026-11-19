import { LISTING_STATUSES } from '@yoyo/shared';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ToMyProfile } from '@/components/profile/ToMyProfile';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = { robots: { index: false } };

/** "My items" lives in the profile now: this address forwards there, keeping `?status=`. */
export default async function Forward({ params, searchParams }: Props) {
  setRequestLocale((await params).locale);
  const raw = (await searchParams)['status'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const status = (LISTING_STATUSES as readonly string[]).includes(value ?? '') ? value : undefined;
  return <ToMyProfile tab="items" status={status} />;
}
