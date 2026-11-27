import { redirect } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

/**
 * `/admin/disputes` itself: the disputes are a view of the deals list (each dispute keeps its own page at
 * `/admin/disputes/:id`, where the emails to administrators lead). Without this, the bare address was a 404.
 */
export default async function DisputesIndex({ params }: Props) {
  const { locale } = await params;
  redirect({ href: '/admin/deals?view=disputes', locale });
}
