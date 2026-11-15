'use client';

import { EMAIL_TOPICS, type EmailTopic } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useEmailPreferences, useSaveEmailPreferences } from '@/lib/notifications/queries';
import { SettingsSection } from './SettingsSection';

/**
 * Email topics (spec §4.7): one switch each, on unless turned off, saved the moment it flips. The bell
 * keeps everything; account and security mail always comes, so it is not a switch.
 */
export function EmailSettings() {
  const t = useTranslations('notifications.email');
  const prefs = useEmailPreferences();
  const save = useSaveEmailPreferences();
  const [said, setSaid] = useState<'saved' | 'failed' | null>(null);

  function flip(topic: EmailTopic) {
    const off = prefs.data?.off ?? [];
    const next = off.includes(topic) ? off.filter((x) => x !== topic) : [...off, topic];
    setSaid(null);
    save.mutate({ off: next }, { onSuccess: () => setSaid('saved'), onError: () => setSaid('failed') });
  }

  return (
    <SettingsSection title={t('title')} intro={t('intro')}>
      {prefs.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-48" />
      ) : prefs.isError ? (
        <Button variant="ghost" onClick={() => void prefs.refetch()}>
          {t('failed')}
        </Button>
      ) : (
        <ul className="divide-ink/10 border-ink/15 divide-y border-y">
          {EMAIL_TOPICS.map((topic) => {
            const on = !(save.variables?.off ?? prefs.data.off).includes(topic);
            return (
              <li key={topic} className="flex items-center justify-between gap-4 py-4">
                <span className="min-w-0">
                  <span id={`email-${topic}`} className="block font-semibold">
                    {t(topic)}
                  </span>
                  <span id={`email-${topic}-hint`} className="text-ink/75 block text-sm">
                    {t(`${topic}_hint`)}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={`email-${topic}`}
                  aria-describedby={`email-${topic}-hint`}
                  disabled={save.isPending}
                  onClick={() => flip(topic)}
                  className={`ease-yoyo relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 ${on ? 'bg-ink border-ink' : 'bg-surface border-ink/40'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`ease-yoyo inline-block size-5 rounded-full transition-transform duration-200 ${on ? 'bg-canvas translate-x-6' : 'bg-ink/60 translate-x-1'}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p aria-live="polite" className="min-h-5 text-sm font-semibold">
        {said ? t(said) : ''}
      </p>
    </SettingsSection>
  );
}
