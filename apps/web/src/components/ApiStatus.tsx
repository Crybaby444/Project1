'use client';

import type { StatusTone } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusIcon } from '@/components/ui/StatusIcon';
import { useApiHealth, type ApiHealth } from '@/lib/use-api-health';

const TONE: Record<ApiHealth, StatusTone> = {
  checking: 'requested',
  online: 'completed',
  offline: 'dispute',
};

/** Live pill showing whether the web app can reach the API. */
export function ApiStatus() {
  const t = useTranslations('apiStatus');
  const health = useApiHealth();

  return (
    <p role="status" aria-live="polite">
      <StatusBadge tone={TONE[health]} icon={<StatusIcon tone={TONE[health]} />}>
        {t(health)}
      </StatusBadge>
    </p>
  );
}
