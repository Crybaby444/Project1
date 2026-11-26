import { useId, type ReactNode } from 'react';

/**
 * A section of a page (DESIGN.md "Page"): its heading at the section step of the type scale, an optional
 * action on the same line (a "See all" link, a button), and its content 16px (20px) below. Sections of a
 * page sit 40px (56px) apart in a `stack-page`.
 */
export function Section({
  title,
  action,
  intro,
  children,
  id,
  className = '',
  headingClassName = 'type-section',
}: {
  title: ReactNode;
  action?: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  /** `type-section` by default; `type-block` for a section inside a narrow column. */
  headingClassName?: string;
}) {
  const own = useId();
  const headingId = id ?? `section-${own.replace(/:/g, '')}`;
  return (
    <section aria-labelledby={headingId} className={`stack-section min-w-0 ${className}`}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id={headingId} className={headingClassName}>
            {title}
          </h2>
          {action}
        </div>
        {intro && <p className="text-ink/75 max-w-read leading-relaxed">{intro}</p>}
      </div>
      {children}
    </section>
  );
}
