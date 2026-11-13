import { STICKER_COLORS, type ListingStatus } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

/**
 * Listing states in the sticker palette (plan 6b): colour, icon and words together. A draft is plain
 * paper (it follows the theme); the others are fixed sticker fills with black text. Mint is never used.
 */
const FILL: Record<ListingStatus, string | null> = {
  DRAFT: null,
  PENDING_REVIEW: STICKER_COLORS.sun,
  PUBLISHED: STICKER_COLORS.blue,
  REJECTED: STICKER_COLORS.ember,
  HIDDEN: STICKER_COLORS.lavender,
  ARCHIVED: '#e9e9e9',
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
  const fill = FILL[status];
  return (
    <span
      data-status={status}
      style={fill ? { backgroundColor: fill, color: '#000000' } : undefined}
      className={`rounded-pill inline-flex min-h-7 items-center gap-1.5 border px-3 text-[13px] font-bold whitespace-nowrap ${
        fill ? 'border-ink/15' : 'border-ink bg-surface text-ink'
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 shrink-0">
        {ICON[status]}
      </svg>
      <span>{t(status)}</span>
    </span>
  );
}
