'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * One builder step: a heading that takes the focus when the step opens (so keyboard and screen
 * reader users land on it), a short intro and the fields.
 */
export function StepSection({
  title,
  intro,
  focusOnMount,
  children,
}: {
  title: string;
  intro: string;
  focusOnMount: boolean;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);
  return (
    <section aria-labelledby="builder-step-title" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h2
          ref={heading}
          id="builder-step-title"
          tabIndex={-1}
          className="text-2xl leading-tight font-bold sm:text-3xl"
        >
          {title}
        </h2>
        <p className="leading-relaxed">{intro}</p>
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
