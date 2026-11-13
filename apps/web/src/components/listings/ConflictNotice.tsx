'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useErrorText } from '@/lib/forms/error-text';

/** Another tab saved this listing first: autosave stopped; load the stored version to go on. */
export function ConflictNotice({ onReload }: { onReload(): Promise<void> }) {
  const t = useTranslations('builder.conflict');
  const errorText = useErrorText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setBusy(true);
    setError(null);
    try {
      await onReload();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      role="alert"
      className="border-ink bg-mist rounded-media flex flex-col gap-3 border p-5 text-ink sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{t('title')}</h2>
        <p className="max-w-[70ch] text-sm leading-relaxed">{t('body')}</p>
        {error && <p className="text-sm font-bold">{error}</p>}
      </div>
      <Button onClick={reload} loading={busy} className="shrink-0 !border-ink/15 !bg-black !text-white">
        {t('reload')}
      </Button>
    </section>
  );
}
