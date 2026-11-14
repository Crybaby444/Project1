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
 * What an empty list shows (v16): the logo's yo-yo going down its string and climbing back, spinning,
 * over a display title, one line and maybe an action, between hairlines. The yo-yo is decoration
 * (aria-hidden) and holds still for people who prefer reduced motion.
 */
export function EmptyState({ title, body, action, headingLevel = 2, className = '' }: EmptyStateProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <section className={`border-ink/15 flex flex-col items-center gap-4 border-y px-6 py-14 text-center sm:py-20 ${className}`}>
      <svg
        viewBox="0 0 48 96"
        aria-hidden="true"
        focusable="false"
        className="h-24 w-12 overflow-visible motion-reduce:[&_*]:!animate-none"
      >
        <line
          x1="24"
          y1="0"
          x2="24"
          y2="64"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="origin-top animate-[empty-string_2.6s_cubic-bezier(0.65,0,0.35,1)_infinite]"
        />
        <g className="animate-[empty-drop_2.6s_cubic-bezier(0.65,0,0.35,1)_infinite]">
          <g className="origin-[24px_70px] animate-[empty-spin_2.6s_cubic-bezier(0.65,0,0.35,1)_infinite]">
            <circle cx="24" cy="70" r="15" fill="currentColor" />
            <path d="M10 70h28" stroke="var(--canvas)" strokeWidth="3" />
          </g>
        </g>
      </svg>
      <Heading className="font-display m-0 max-w-[18ch] text-[clamp(2rem,4vw,3rem)] leading-[0.95] font-black text-balance uppercase">
        {title}
      </Heading>
      {body ? <p className="text-ink/80 m-0 max-w-[52ch] leading-relaxed">{body}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2.5">{action}</div> : null}
    </section>
  );
}
