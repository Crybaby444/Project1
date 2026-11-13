'use client';

import type { StickerColor } from '@yoyo/shared';
import { useId, type ReactNode } from 'react';

export type Choice<T extends string> = { value: T; label: ReactNode; color?: StickerColor };

type ChoicePillsProps<T extends string> = {
  legend: string;
  /** Visually hide the legend (it still names the group). */
  hideLegend?: boolean;
  choices: Choice<T>[];
  value: T | null;
  onChange(value: T): void;
  hint?: string;
  error?: string | undefined;
  disabled?: boolean;
  /** A note after the legend, such as "required". */
  note?: string;
  name?: string;
};


/**
 * One choice of a few, as pill-shaped radio buttons (native radios, so arrows move between them and
 * screen readers announce "1 of 4"). The chosen pill turns Carbon; others may carry a sticker colour.
 */
export function ChoicePills<T extends string>({
  legend,
  hideLegend = false,
  choices,
  value,
  onChange,
  hint,
  error,
  disabled = false,
  note,
  name,
}: ChoicePillsProps<T>) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" aria-describedby={describedBy} disabled={disabled}>
      <legend className={hideLegend ? 'sr-only' : 'mb-2 text-[13px] font-bold tracking-[0.03em] uppercase'}>
        {legend}
        {note && <span className="ml-2 font-medium tracking-normal normal-case">· {note}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const checked = choice.value === value;
          const fill =
            false   // v16: no sticker fills; the chosen pill is the only filled one
              ? {}
              : undefined;
          return (
            <label
              key={choice.value}
              style={fill}
              className={`rounded-pill ease-yoyo has-focus-visible:outline-ink relative inline-flex min-h-10 cursor-pointer items-center gap-2 border px-4 py-2 text-left text-sm leading-snug font-bold transition-[transform,background-color,color] duration-250 select-none hover:-translate-y-0.5 active:scale-[0.96] has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-disabled:cursor-default has-disabled:opacity-55 ${checked ? 'border-cta bg-cta text-cta-fg' : fill ? 'border-ink/15' : 'border-ink bg-surface text-ink'}`}
            >
              <input
                type="radio"
                name={name ?? id}
                value={choice.value}
                checked={checked}
                onChange={() => onChange(choice.value)}
                className="sr-only"
              />
              {checked && (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 shrink-0">
                  <path
                    d="m5 12.5 4.5 4.5L19 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {choice.label}
            </label>
          );
        })}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-sm">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm font-bold">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="text-sticker-ember mt-0.5 size-4 shrink-0">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="M12 7v6M12 16.5v.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </fieldset>
  );
}
