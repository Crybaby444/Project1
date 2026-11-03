import { cloneElement, type InputHTMLAttributes, type ReactElement, useId } from 'react';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  /** A single form control (input, select, textarea). */
  children: ReactElement<InputHTMLAttributes<HTMLElement>>;
  className?: string;
};

const CONTROL_CLASSES =
  'min-h-11 w-full rounded-full border border-ink bg-surface px-4 text-[15px] text-ink placeholder:text-ink-muted aria-invalid:border-sticker-ember aria-invalid:border-2';

/** Labelled form control with an optional hint and an Ember error (icon + text). */
export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  const id = useId();
  const controlId = children.props.id ?? `${id}-control`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  const control = cloneElement(children, {
    id: controlId,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    className: `${CONTROL_CLASSES} ${children.props.className ?? ''}`,
  });

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={controlId} className="px-1 text-[14px] font-bold">
        {label}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-ink-muted px-1 text-[14px]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-ink flex items-center gap-1.5 px-1 text-[14px] font-bold">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" className="shrink-0">
            <circle cx="8" cy="8" r="7.5" fill="var(--sticker-ember)" stroke="var(--ink)" />
            <path d="M8 4.5v4.5M8 11.2v.3" stroke="#000" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
