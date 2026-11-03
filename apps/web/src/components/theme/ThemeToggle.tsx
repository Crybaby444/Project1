'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { IconButton } from '../ui/IconButton';
import { useTheme } from './ThemeProvider';

/** Flips between light and dark; the new theme grows out of the button. */
export function ThemeToggle() {
  const t = useTranslations('theme');
  const { setPreference } = useTheme();

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const isDark = document.documentElement.dataset.theme === 'dark';
    setPreference(isDark ? 'light' : 'dark', {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  return (
    <IconButton label={t('toggle')} onClick={onClick} className="relative overflow-hidden">
      {/* Both icons are rendered; CSS picks one by data-theme, so SSR never mismatches. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="absolute transition-[rotate,scale,opacity] duration-(--dur-slow) ease-yoyo dark:scale-50 dark:-rotate-90 dark:opacity-0"
      >
        <circle cx="12" cy="12" r="4.2" fill="var(--sticker-sun)" stroke="currentColor" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className="absolute scale-50 rotate-90 opacity-0 transition-[rotate,scale,opacity] duration-(--dur-slow) ease-yoyo dark:scale-100 dark:rotate-0 dark:opacity-100"
      >
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
          fill="var(--sticker-lavender)"
          stroke="currentColor"
        />
      </svg>
    </IconButton>
  );
}
