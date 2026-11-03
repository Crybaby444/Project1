import { cloneElement, isValidElement, useId, type ReactElement } from 'react';

type InputLikeProps = {
  id?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
};

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  /** Exactly one input, select or textarea. */
  children: ReactElement<InputLikeProps>;
  className?: string;
};

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sticker-ember">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 7v6M12 16.5v.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Label + control + optional hint and error, wired for assistive tech.
 * The error icon is Ember; its text stays ink so it meets AA contrast on every surface.
 */
export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  const generatedId = useId();
  if (!isValidElement(children)) throw new Error('Field expects a single input element');

  const inputId = children.props.id ?? `${generatedId}-input`;
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy = [children.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = cloneElement(children, {
    id: inputId,
    'aria-describedby': describedBy,
    ...(error ? { 'aria-invalid': true } : {}),
  });

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-[13px] font-bold tracking-[0.03em] uppercase">
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-sm">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} aria-live="polite" className="flex items-start gap-1.5 text-sm font-bold">
          <ErrorIcon />
          {error}
        </p>
      )}
    </div>
  );
}
