'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SearchBox } from '@/components/catalog/SearchBox';
import { usePathname } from '@/i18n/navigation';

/**
 * The header's search cell, the site's only search (owner, 2026-11-28): it fills what the other cells leave.
 * When that is too narrow for a usable box (a container query, under 200px: every phone) it becomes a
 * magnifier that opens the search full width under the bar. On the results page it holds what was searched,
 * so the words can be changed where they were typed; anywhere else it starts empty.
 */
export function SearchCell() {
  const t = useTranslations('catalog.search');
  const tn = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Read from the address after a page change (useSearchParams would need a Suspense boundary in the layout).
    /* eslint-disable react-hooks/set-state-in-effect -- follows the address after each navigation */
    setQuery(pathname === '/search' ? (new URLSearchParams(window.location.search).get('q') ?? '') : '');
    setOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector('input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  // The panel sits outside the container: a size container is the containing block of what is positioned
  // inside it, and the panel has to span the whole capsule, not the magnifier's 40px.
  return (
    <>
    <div className="@container flex min-w-0 flex-1 items-center justify-end">
      <SearchBox key={`bar-${query}`} compact initialQuery={query} label={tn('search')} className="w-full @max-[199px]:hidden" />
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
    </div>
      {open && (
        <div ref={panel} className="border-ink/15 bg-canvas rounded-float animate-pop-in shadow-pop absolute inset-x-0 top-[calc(100%+8px)] z-40 border p-3 sm:p-4">
          <SearchBox key={`panel-${query}`} initialQuery={query} label={tn('search')} className="mx-auto max-w-3xl" />
        </div>
      )}
    </>
  );
}
