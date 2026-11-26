import type { ReactNode } from 'react';
import { Sheet } from './Sheet';

type EmptyStateProps = {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  /** The heading level in the page's outline (h2 by default). */
  headingLevel?: 2 | 3;
  className?: string;
};

/**
 * What an empty list shows: a quiet sheet like every other block (owner, 2026-11-26: no swinging yo-yo and
 * no poster-size title). A small empty-tray mark, the title at the block step, one line of what to do, and
 * the action at the end of the row on wider screens.
 */
export function EmptyState({ title, body, action, headingLevel = 2, className = '' }: EmptyStateProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <Sheet data-empty-state="" className={`flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5 ${className}`}>
      <span aria-hidden="true" className="border-ink/15 bg-mist text-ink/70 rounded-tile grid size-12 shrink-0 place-items-center border">
        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6]">
          <path d="M4 13.5 6.2 6.6A2 2 0 0 1 8.1 5.2h7.8a2 2 0 0 1 1.9 1.4L20 13.5" />
          <path d="M4 13.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5h-4.5a1 1 0 0 0-.9.6l-.4.8a1 1 0 0 1-.9.6h-2.6a1 1 0 0 1-.9-.6l-.4-.8a1 1 0 0 0-.9-.6Z" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Heading className="type-block m-0">{title}</Heading>
        {body ? <p className="text-ink/75 max-w-read m-0 text-sm leading-relaxed sm:text-base">{body}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2.5 sm:shrink-0 sm:justify-end">{action}</div> : null}
    </Sheet>
  );
}
