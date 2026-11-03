import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
} from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** The control: an <input>, <textarea> or <select>. */
  children: ReactElement<InputHTMLAttributes<HTMLElement>>;
  className?: string;
}

export const fieldControlClasses =
  'min-h-11 w-full rounded-pill border border-ink bg-surface px-4 text-[15px] text-ink placeholder:text-ink/55 aria-invalid:border-sticker-ember aria-invalid:border-2';

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  const id = useId();
  const controlId = children.props.id ?? `${id}-control`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        className: `${fieldControlClasses} ${children.props.className ?? ''}`,
      })
    : children;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={controlId} className="text-[14px] font-bold tracking-[0.01em]">
        {label}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" className="shrink-0">
            <circle cx="8" cy="8" r="7.5" fill="var(--sticker-ember)" stroke="var(--ink)" />
            <path d="M8 4v5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="8" cy="11.6" r="1" fill="#000" />
          </svg>
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-[14px] text-ink/75">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
