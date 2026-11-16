'use client';

import type { Locale } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { MenuRoot } from '@/lib/catalog/menu';
import { localized } from '@/lib/listings/categories';
import { categoryPath } from '@/lib/seo';

/**
 * The header's Catalog cell (owner, 2026-11-16: a navigation like a row of cells): one button that opens a
 * full-width panel under the bar with every category and its subcategories (a disclosure of plain links),
 * and the way to all categories. Escape, a click outside or following a link closes it.
 */
export function CatalogMenu({ roots, className = '', onOpenChange }: { roots: MenuRoot[]; className?: string; onOpenChange?(open: boolean): void }) {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const panel = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={root} className={`flex ${className}`} onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        data-nav-item=""
        className={`rounded-pill ease-yoyo relative z-10 flex h-10 items-center gap-2 px-4 text-[14.5px] font-semibold whitespace-nowrap transition-colors duration-200 ${open ? 'bg-ink text-canvas' : 'hover:text-ink'}`}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
          <path d="M2 2.5h5v5H2zM9 2.5h5v5H9zM2 9.5h5v5H2zM9 9.5h5v5H9z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        {t('catalog')}
        <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-2.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={panel} hidden={!open} className="border-ink/10 bg-canvas animate-sheet-drop fixed top-[84px] left-1/2 z-40 max-h-[calc(100dvh-110px)] w-[min(1280px,calc(100vw-40px))] -translate-x-1/2 overflow-y-auto rounded-[32px] border shadow-[0_40px_80px_-30px_rgba(10,11,14,0.45),0_2px_6px_rgba(10,11,14,0.06)]">
        <div className="grid grid-cols-3 gap-x-10 gap-y-9 px-10 pt-10 pb-8 xl:grid-cols-4">
          {roots.map((r) => (
            <div key={r.slugs.en} className="flex min-w-0 flex-col gap-2.5">
              <Link href={categoryPath(r.slugs[locale])} className="font-display text-[1.55rem] leading-none font-black uppercase [overflow-wrap:anywhere] hover:underline">
                {localized(r.names, locale)}
              </Link>
              <ul className="flex flex-col">
                {r.children.map((child) => (
                  <li key={child.slugs.en}>
                    <Link href={categoryPath(child.slugs[locale])} className="text-ink/80 hover:text-ink flex min-h-8 items-center text-[14.5px]">
                      {localized(child.names, locale)}
                    </Link>
                  </li>
                ))}
                {r.more > 0 && (
                  <li>
                    <Link href={categoryPath(r.slugs[locale])} className="flex min-h-8 items-center text-[14px] font-bold underline decoration-1 underline-offset-4">
                      {t('more', { count: r.more })}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-ink/10 bg-ink/[0.03] flex flex-wrap items-center gap-x-6 gap-y-2 border-t px-10 py-5 text-[15px] font-semibold">
          <Link href="/c" className="underline decoration-1 underline-offset-4">
            {t('allCategoriesPage')}
          </Link>
          <Link href="/search?sort=new">{t('newest')}</Link>
          <Link href="/faq">{t('faq')}</Link>
        </div>
      </div>
    </div>
  );
}
