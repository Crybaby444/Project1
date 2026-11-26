import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  /** The heading level in the page's outline (h2 by default). */
  headingLevel?: 2 | 3;
  className?: string;
};

/**
 * What an empty list shows: a quiet sheet like every other block of the account (owner, 2026-11-26:
 * no swinging yo-yo and no poster-size title). A small empty-tray mark, the title at block-heading
 * size, one line of what to do, and the action at the end of the row on wider screens.
 */
export function EmptyState({ title, body, action, headingLevel = 2, className = '' }: EmptyStateProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <section
      data-empty-state=""
      className={`sheet border-ink/15 rounded-media flex flex-col items-start gap-4 border p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6 ${className}`}
    >
      <span aria-hidden="true" className="border-ink/15 bg-mist text-ink/70 grid size-12 shrink-0 place-items-center rounded-[14px] border">
        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6]">
          <path d="M4 13.5 6.2 6.6A2 2 0 0 1 8.1 5.2h7.8a2 2 0 0 1 1.9 1.4L20 13.5" />
          <path d="M4 13.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5h-4.5a1 1 0 0 0-.9.6l-.4.8a1 1 0 0 1-.9.6h-2.6a1 1 0 0 1-.9-.6l-.4-.8a1 1 0 0 0-.9-.6Z" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Heading className="font-display m-0 text-2xl leading-[0.95] font-black text-balance uppercase sm:text-[1.75rem]">{title}</Heading>
        {body ? <p className="text-ink/75 m-0 max-w-[62ch] text-sm leading-relaxed sm:text-base">{body}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2.5 sm:shrink-0 sm:justify-end">{action}</div> : null}
    </section>
  );
}
