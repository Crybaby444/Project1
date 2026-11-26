'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * One builder step: a heading that takes the focus when the step opens (so keyboard and screen
 * reader users land on it), where it is among the steps as a chip beside it ("4 / 6", read out as
 * "Step 4 of 6"), a short intro and the fields.
 */
export function StepSection({
  title,
  intro,
  focusOnMount,
  place,
  children,
}: {
  title: string;
  intro: string;
  focusOnMount: boolean;
  /** `{ short: '4 / 6', said: 'Step 4 of 6' }` */
  place?: { short: string; said: string };
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);
  return (
    <section aria-labelledby="builder-step-title" className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 ref={heading} id="builder-step-title" tabIndex={-1} className="type-section outline-none [overflow-wrap:anywhere]">
            {title}
          </h2>
          {place && (
            <span className="border-ink/20 rounded-pill inline-flex min-h-8 -translate-y-1 items-center border px-3 text-sm font-bold tabular-nums">
              <span aria-hidden="true">{place.short}</span>
              <span className="sr-only">{place.said}</span>
            </span>
          )}
        </div>
        <p className="text-ink/75 max-w-read leading-relaxed">{intro}</p>
      </header>
      {children}
    </section>
  );
}

/** "12 / 80" under a text field; the field points to it with aria-describedby. */
export function TextCounter({ id, label }: { id: string; label: string }) {
  return (
    <p id={id} className="self-end text-sm tabular-nums">
      {label}
    </p>
  );
}
