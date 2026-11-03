'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from './ThemeProvider';

/**
 * Flips between light and dark; the reveal circle grows from the button. The icon follows
 * <html data-theme> through CSS so it is correct on the very first paint.
 */
export function ThemeToggle() {
  const t = useTranslations('theme');
  const { preference, setPreference } = useTheme();

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const dark = document.documentElement.dataset.theme === 'dark';
    setPreference(dark ? 'light' : 'dark', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <IconButton label={t('toggle')} title={`${t('toggle')} · ${t(preference)}`} onClick={onClick}>
      <span className="grid transition-transform duration-[450ms] ease-yoyo dark:-rotate-90" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="col-start-1 row-start-1 dark:hidden"
        >
          <circle cx="12" cy="12" r="4.25" fill="var(--sticker-sun)" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          className="col-start-1 row-start-1 hidden dark:block"
        >
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="var(--sticker-sun)" />
        </svg>
      </span>
    </IconButton>
  );
}
