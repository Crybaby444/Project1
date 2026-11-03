'use client';

import type { StatusTone } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useApiHealth, type ApiHealth } from '@/lib/use-api-health';
import { StatusBadge } from './ui/StatusBadge';

const TONE: Record<ApiHealth, StatusTone> = {
  checking: 'cancelled',
  online: 'active',
  offline: 'dispute',
};

function Icon({ health }: { health: ApiHealth }) {
  if (health === 'online') {
    return (
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (health === 'offline') {
    return (
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
    </svg>
  );
}

/** Live API health as a status pill (polite live region, so changes are announced). */
export function ApiStatusPill() {
  const t = useTranslations('apiStatus');
  const health = useApiHealth();
  return (
    <span role="status" aria-live="polite">
      <StatusBadge tone={TONE[health]} icon={<Icon health={health} />}>
        {t(health)}
      </StatusBadge>
    </span>
  );
}
