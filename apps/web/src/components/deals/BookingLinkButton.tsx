'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getPathname } from '@/i18n/navigation';

/**
 * Copies the item's booking page address (`/items/:id/book`), so the owner can share it. Until the
 * catalog (plan 7) lists items, this is how renters reach a listing. Without a clipboard (an insecure
 * page, an old browser) it opens the page instead.
 */
export function BookingLinkButton({ listingId }: { listingId: string }) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const toast = useToast();
  const path = getPathname({ href: `/items/${listingId}/book`, locale });

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
