import type { ReactNode } from 'react';
import { displayFit } from '@/lib/display-fit';

type ErrorViewProps = {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
  /** The "back to home" link; callers pass a locale-aware one when they can. */
  backLink: ReactNode;
};

/** Yoyo-styled "something broke" screen, shared by the localized and the global error boundaries. */
export function ErrorView({ title, body, retryLabel, onRetry, backLink }: ErrorViewProps) {
  return (
    <main className="@container mx-auto flex min-h-dvh max-w-[1440px] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p
        aria-hidden="true"
        style={displayFit('500', { min: '3rem', max: '10rem' })}
        className="font-display text-display-fit leading-[0.8] font-black"
      >
        500
      </p>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-[46ch] leading-relaxed">{body}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 items-center rounded-pill border border-cta bg-cta px-5 text-[13px] font-bold tracking-[0.03em] text-cta-fg uppercase transition-transform duration-150 ease-yoyo hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {retryLabel}
        </button>
        {backLink}
      </div>
    </main>
  );
}

/** Ghost-button classes for a plain link (used where the locale-aware Link is unavailable). */
export const GHOST_LINK_CLASSES =
  'inline-flex min-h-10 items-center rounded-pill border border-ink bg-surface px-5 text-[13px] font-bold tracking-[0.03em] text-ink uppercase transition-transform duration-150 ease-yoyo hover:-translate-y-0.5 active:scale-[0.97]';
