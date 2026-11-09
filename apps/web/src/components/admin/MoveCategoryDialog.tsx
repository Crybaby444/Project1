'use client';

import type { CategoryNode, Locale } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { OTHER_CATEGORY } from '@/lib/listings/queries';

/**
 * Files a listing under another category (C02: the moderation of «Other»). Only leaves can hold
 * listings, so the choice lists the subcategories under their roots; «Other» itself is left out. The
 * API keeps the status, drops attribute values the new category does not know, and emails the owner.
 */
export function MoveCategoryDialog({
  categories,
  currentId,
  title,
  busy,
  onClose,
  onMove,
}: {
  categories: CategoryNode[];
  currentId: string | null;
  title: string;
  busy: boolean;
  onClose(): void;
  onMove(categoryId: string): void;
}) {
  const t = useTranslations('moderation.move');
  const locale = useLocale() as Locale;
  const selectId = useId();
  const errorId = useId();
  const [choice, setChoice] = useState('');
  const [tried, setTried] = useState(false);
  const roots = categories.filter((root) => root.slug !== OTHER_CATEGORY && root.children.length > 0);
  const missing = tried && choice === '';

  return (
    <Dialog open onClose={onClose} title={t('title', { title })}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTried(true);
          if (choice) onMove(choice);
        }}
      >
        <p className="leading-relaxed">{t('body')}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={selectId} className="text-sm font-bold">
            {t('label')}
          </label>
          <select
            id={selectId}
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            aria-invalid={missing || undefined}
            aria-describedby={missing ? errorId : undefined}
            className="border-ink bg-surface rounded-pill min-h-12 w-full border px-4 text-base"
          >
            <option value="">{t('placeholder')}</option>
            {roots.map((root) => (
              <optgroup key={root.id} label={root.names[locale]}>
                {root.children.map((leaf) => (
                  <option key={leaf.id} value={leaf.id} disabled={leaf.id === currentId}>
                    {leaf.names[locale]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {missing && (
            <p id={errorId} className="text-sm font-bold">
              {t('required')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t('submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
