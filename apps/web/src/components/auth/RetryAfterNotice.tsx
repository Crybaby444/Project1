'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * "Too many attempts, try again in N s", ticking down while the submit button waits.
 * The ticking text is hidden from screen readers; the live region says the wait once, when it starts
 * (and again only if a longer wait replaces it), instead of reading every second aloud.
 */
export function RetryAfterNotice({ seconds, inline = false }: { seconds: number; inline?: boolean }) {
  if (seconds <= 0) return null;
  return <Notice seconds={seconds} inline={inline} />;
}

function Notice({ seconds, inline }: { seconds: number; inline: boolean }) {
  const t = useTranslations('errors');
  const [announced, setAnnounced] = useState(seconds);
  if (seconds > announced) setAnnounced(seconds); // a new, longer wait

  return (
    <div className={inline ? 'text-sm' : 'bg-mist rounded-media px-4 py-3 text-sm font-bold'}>
      <p role="status" className="sr-only">
        {t('retryIn', { seconds: announced })}
      </p>
      <p aria-hidden="true">{t('retryIn', { seconds })}</p>
    </div>
  );
}
