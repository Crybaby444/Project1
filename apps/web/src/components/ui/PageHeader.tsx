import type { ReactNode } from 'react';
import { displayFit } from '@/lib/display-fit';

/**
 * The head of an account page, the same on every one (owner, 2026-11-26: one style, like the admin panel):
 * the title, how many there are as a chip beside it, a line on what the page is, and its action on the right.
 */
export function PageHeader({ title, intro, count, action }: { title: string; intro?: ReactNode; count?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="@container flex min-w-0 flex-1 flex-col gap-2">
        <h1 className="font-display flex flex-wrap items-baseline gap-x-4 leading-[0.85] font-black uppercase">
          <span style={displayFit(title, { max: '3.5rem' })} className="text-display-fit">
            {title}
          </span>
          {count !== undefined && (
            <span className="border-ink/20 rounded-pill inline-flex min-h-9 -translate-y-1.5 items-center border px-3 font-sans text-base font-bold tracking-normal normal-case tabular-nums">
              {count}
            </span>
          )}
        </h1>
        {intro && <p className="text-ink/75 max-w-read leading-relaxed">{intro}</p>}
      </div>
      {action}
    </header>
  );
}
