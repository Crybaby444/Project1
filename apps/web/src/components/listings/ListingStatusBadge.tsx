import type { ListingStatus } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

/**
 * Listing states in black and white (v16, owner 2026-11-13: no colour): the look, the icon and the words
 * tell them apart. Live is solid ink, waiting is dashed, rejected carries the one red, hidden and
 * archived are quiet.
 */
const TONE: Record<ListingStatus, string> = {
  DRAFT: 'border-ink text-ink',
  PENDING_REVIEW: 'border-ink border-dashed text-ink',
  PUBLISHED: 'border-ink bg-ink text-canvas',
  REJECTED: 'border-[var(--danger)] text-ink [&_svg]:text-[var(--danger)]',
  HIDDEN: 'border-ink/40 text-ink/80',
  ARCHIVED: 'border-transparent bg-mist text-ink/80',
};

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ICON: Record<ListingStatus, ReactNode> = {
  DRAFT: <path {...STROKE} d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  PENDING_REVIEW: (
    <>
      <circle {...STROKE} cx="12" cy="12" r="8.5" />
      <path {...STROKE} d="M12 7.5V12l3 2" />
    </>
  ),
  PUBLISHED: (
    <>
      <circle {...STROKE} cx="12" cy="12" r="8.5" />
      <path {...STROKE} d="m8 12.5 2.8 2.8L16.5 9.5" />
    </>
  ),
  REJECTED: (
    <>
      <circle {...STROKE} cx="12" cy="12" r="8.5" />
      <path {...STROKE} d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  HIDDEN: (
    <path {...STROKE} d="M3 12s3.5-6 9-6c1.6 0 3 .5 4.2 1.2M21 12s-3.5 6-9 6c-1.6 0-3-.5-4.2-1.2M4 20 20 4" />
  ),
  ARCHIVED: <path {...STROKE} d="M4 7h16v3H4zM5.5 10v9h13v-9M10 13.5h4" />,
};

export function ListingStatusBadge({
  status,
  className = '',
}: {
  status: ListingStatus;
  className?: string;
}) {
  const t = useTranslations('listingStatus');
  return (
    <span
      data-status={status}
      data-tone={status.toLowerCase()}
      className={`rounded-pill inline-flex min-h-7 items-center gap-1.5 border px-3 text-[13px] font-bold whitespace-nowrap ${TONE[status]} ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 shrink-0">
        {ICON[status]}
      </svg>
      <span>{t(status)}</span>
    </span>
  );
}
