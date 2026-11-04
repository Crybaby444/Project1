'use client';

import { THEME_PREFERENCES } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { useThemeChoice } from './use-theme-choice';

/** System / Light / Dark as a segmented radio group (settings). */
export function ThemeSelect() {
  const t = useTranslations('theme');
  const { preference, choose } = useThemeChoice();
  const legendId = useId();

  return (
    <fieldset role="radiogroup" aria-labelledby={legendId} className="flex flex-col gap-1.5">
      <legend id={legendId} className="mb-1.5 text-[13px] font-bold tracking-[0.03em] uppercase">
        {t('label')}
      </legend>
      <div className="border-ink bg-surface rounded-pill flex w-full flex-wrap gap-1 border p-1 sm:w-fit">
        {THEME_PREFERENCES.map((option) => (
          <label key={option} className="relative flex-1 sm:flex-none">
            <input
              type="radio"
              name={`${legendId}-theme`}
              value={option}
              checked={preference === option}
              onChange={() => choose(option)}
              className="peer sr-only"
            />
            <span className="peer-checked:bg-cta peer-checked:text-cta-fg hover:bg-mist peer-checked:hover:bg-cta rounded-pill ease-yoyo peer-focus-visible:outline-ink flex min-h-10 cursor-pointer items-center justify-center px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-[background-color,color,transform] duration-200 select-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 active:scale-[0.97]">
              {t(option)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
