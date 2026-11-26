'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SearchBox } from '@/components/catalog/SearchBox';

/**
 * The header's search cell fills what the other cells leave. When that is too narrow for a usable box
 * (a container query, under 200px) it becomes a magnifier that opens the search full width under the bar.
 */
export function SearchCell() {
  const t = useTranslations('catalog.search');
  const tn = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector('input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className="@container flex min-w-0 flex-1 items-center">
      <SearchBox compact label={tn('search')} className="w-full @max-[199px]:hidden" />
      <button
        type="button"
        aria-label={t('label')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="border-ink/20 hover:border-ink rounded-pill inline-grid size-10 place-items-center border @min-[200px]:hidden"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div ref={panel} className="border-ink/15 bg-canvas animate-pop-in absolute inset-x-0 top-full z-40 border-b px-8 py-5 shadow-pop">
          <SearchBox label={tn('search')} className="mx-auto max-w-3xl" />
        </div>
      )}
    </div>
  );
}
