'use client';

import { useTranslations } from 'next-intl';
import { StatusBadge } from './ui/StatusBadge';
import { useApiHealth } from '@/lib/use-api-health';

const TONE = { checking: 'requested', online: 'active', offline: 'dispute' } as const;

export function ApiStatusPill() {
  const t = useTranslations('apiStatus');
  const health = useApiHealth();

  return (
    <p role="status" aria-label={t('label')} className="inline-flex">
      <StatusBadge
        tone={TONE[health]}
        icon={
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="5" fill={health === 'online' ? 'currentColor' : 'none'} />
          </svg>
        }
      >
        {t(health)}
      </StatusBadge>
    </p>
  );
}
