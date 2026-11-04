'use client';

import { useTranslations } from 'next-intl';
import { useState, type InputHTMLAttributes, type Ref } from 'react';
import { INPUT_CLASS } from '@/components/ui/inputs';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  ref?: Ref<HTMLInputElement>;
};

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * A password input with a "show password" eye (aria-pressed says whether it is shown).
 * Put it inside a Field: the id and aria-* that Field adds go to the input itself.
 */
export function PasswordField({ className = '', ref, ...inputProps }: PasswordFieldProps) {
  const t = useTranslations('auth.password');
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        {...inputProps}
        ref={ref}
        type={shown ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${INPUT_CLASS} pr-14 ${className}`}
      />
      <button
        type="button"
        aria-label={t('show')}
        aria-pressed={shown}
        title={t('show')}
        onClick={() => setShown((value) => !value)}
        className="text-ink hover:bg-mist rounded-pill ease-yoyo absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center transition-colors duration-150"
      >
        <EyeIcon open={shown} />
      </button>
    </div>
  );
}
