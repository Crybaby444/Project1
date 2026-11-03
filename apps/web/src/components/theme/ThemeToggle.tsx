'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from './ThemeProvider';

const ICON =
  'col-start-1 row-start-1 size-5 transition-[transform,opacity] duration-[450ms] ease-yoyo';

/** Circular light/dark switch; the new theme grows out of the button as a circle. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useTranslations('theme');
  const { resolved, setPreference } = useTheme();
  const dark = resolved === 'dark';

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPreference(dark ? 'light' : 'dark', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <IconButton label={t('toggle')} title={dark ? t('light') : t('dark')} onClick={onClick} className={className}>
      {/* Sun (light) and moon (dark) swap with a quarter turn. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`${ICON} ${dark ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`${ICON} ${dark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </IconButton>
  );
}
