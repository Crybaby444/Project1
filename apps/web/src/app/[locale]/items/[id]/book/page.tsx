import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookingPage } from '@/components/deals/BookingPage';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });
  return { title: `${t('pageTitle')} · Yoyo`, robots: { index: false } };
}

/**
 * Booking an item. Open to everyone (the terms are public); sending the request asks to sign in.
 * Until the catalog's item page (plan 7) is in, this is how an item is booked; afterwards it stays as
 * the direct link to booking, and the item page embeds the same BookingPanel.
 */
export default async function BookItemPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <BookingPage listingId={id} />;
}
