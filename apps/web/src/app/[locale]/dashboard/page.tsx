import type { Locale } from '@yoyo/shared';
import { redirect } from 'next/navigation';
import { localizedPath } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

/** /dashboard is My profile: it opens on my items. */
export default async function MySpace({ params }: Props) {
  const { locale } = await params;
  redirect(localizedPath(locale as Locale, '/dashboard/lending'));
}
