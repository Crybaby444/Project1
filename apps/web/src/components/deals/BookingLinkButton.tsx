'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getPathname } from '@/i18n/navigation';

/**
 * Copies the address of the item's page (`/listings/:id`: photos, words, the owner and the booking panel in
 * one place), so the owner can send it to anyone. It used to copy the bare booking page from before the
 * catalog had item pages; that address still works for links already sent. Without a clipboard (an
 * insecure page, an old browser) it opens the page instead.
 */
export function BookingLinkButton({ listingId }: { listingId: string }) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const toast = useToast();
  const path = getPathname({ href: `/listings/${listingId}`, locale });

  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.show(t('shareCopied'));
    } catch {
      window.location.assign(url);
    }
  }

  return (
    <Button variant="ghost" onClick={() => void copy()} data-booking-link={path}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </svg>
      {t('shareLink')}
    </Button>
  );
}
