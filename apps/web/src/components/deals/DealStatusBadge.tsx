import type { BookingStatus } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusIcon } from '@/components/ui/StatusIcon';
import { toneOf } from '@/lib/deals/status';

/** A deal's status as a sticker pill: colour, icon and words (DESIGN.md §4), never colour alone. */
export function DealStatusBadge({ status, className = '' }: { status: BookingStatus; className?: string }) {
  const t = useTranslations('dealStatus');
  const tone = toneOf(status);
  return (
    <StatusBadge tone={tone} icon={<StatusIcon tone={tone} />} className={className}>
      <span data-deal-status={status}>{t(status)}</span>
    </StatusBadge>
  );
}
