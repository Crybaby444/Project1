import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ToMyProfile } from '@/components/profile/ToMyProfile';

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = { robots: { index: false } };

/** Lives in the profile now: this address forwards to its "items" tab. */
export default async function Forward({ params }: Props) {
  setRequestLocale((await params).locale);
  return <ToMyProfile tab="items" />;
}
