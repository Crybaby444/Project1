import { redirect } from 'next/navigation';

type Props = { params: Promise<{ locale: string; id: string }> };

/** Dispute emails link here (DealNotifier): the dispute is decided on the deal's admin page. */
export default async function DisputePage({ params }: Props) {
  const { locale, id } = await params;
  redirect(`/${locale}/admin/deals/${encodeURIComponent(id)}`);
}
