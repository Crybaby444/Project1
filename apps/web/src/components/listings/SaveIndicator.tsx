'use client';

import { useTranslations } from 'next-intl';
import type { SaveState } from '@/lib/listings/use-listing-draft';

const DOT: Record<SaveState, string> = {
  idle: 'bg-ink/30',
  saving: 'bg-sticker-sun animate-pulse',
  saved: 'bg-sticker-blue',
  error: 'bg-sticker-ember',
  invalid: 'bg-sticker-ember',
  conflict: 'bg-sticker-ember',
  readonly: 'bg-mist',
};

/** Where autosave stands, announced politely as it changes. */
export function SaveIndicator({ state }: { state: SaveState }) {
  const t = useTranslations('builder.save');
  return (
    <p
      role="status"
      aria-live="polite"
      className="border-ink bg-surface rounded-pill inline-flex min-h-9 items-center gap-2 self-start border px-3.5 text-sm font-bold sm:self-auto"
    >
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full border border-black ${DOT[state]}`}
      />
      {t(state)}
    </p>
  );
}
