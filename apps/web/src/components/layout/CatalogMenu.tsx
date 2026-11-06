'use client';

import type { CategoryNode, Locale, LocalizedText, StickerColor } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { categoryPath, localePath as localeHref } from '@/lib/seo';

/** A root of the menu: its name, address and the first few subcategories. */
export type MenuRoot = {
  slugs: LocalizedText;
  names: LocalizedText;
  sticker: StickerColor;
  children: { slugs: LocalizedText; names: LocalizedText }[];
  /** Subcategories not shown in the menu. */
  more: number;
};

/** Subcategories shown under each root. */
const SHOWN = 3;

/** What the header needs of the category tree: small enough to send with every page. */
export function menuRoots(tree: CategoryNode[]): MenuRoot[] {
  return tree.map((root) => ({
    slugs: root.slugs,
    names: root.names,
    sticker: root.sticker,
    children: root.children.slice(0, SHOWN).map((child) => ({ slugs: child.slugs, names: child.names })),
    more: Math.max(0, root.children.length - SHOWN),
  }));
}

const DOT: Record<StickerColor, string> = {
  blue: 'bg-sticker-blue',
  mint: 'bg-sticker-mint',
  lavender: 'bg-sticker-lavender',
  ember: 'bg-sticker-ember',
  sun: 'bg-sticker-sun',
  violet: 'bg-sticker-violet',
};

const LINK = 'rounded-pill underline-offset-4 hover:underline [overflow-wrap:anywhere] hyphens-auto';

/**
 * «Catalog» in the header (W03 §E): a disclosure button over a panel of plain links to every root
 * category, a few subcategories of each, all categories and search. The panel is always in the page
 * (`hidden` when closed), so the links are there for search engines and for people without scripts.
 * Esc, a click outside and opening a link close it; the focus goes back to the button on Esc.
 */
export function CatalogMenu({ roots }: { roots: MenuRoot[] }) {
  const t = useTranslations('header.catalog');
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="static">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="border-ink bg-surface text-ink rounded-pill ease-yoyo inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 border px-2.5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96] sm:px-4"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className="sr-only md:not-sr-only">{t('button')}</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`ease-yoyo hidden size-3.5 transition-transform duration-250 md:block ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="border-ink bg-surface animate-pop-in absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b"
      >
        <nav aria-label={t('label')} className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <a href={localeHref(locale, '/c')} className="bg-cta text-cta-fg border-cta rounded-pill inline-flex min-h-10 items-center border px-4 text-[13px] font-bold tracking-[0.03em] uppercase">
              {t('all')}
            </a>
            <a href={localeHref(locale, '/search')} className="border-ink rounded-pill inline-flex min-h-10 items-center gap-2 border px-4 text-[13px] font-bold tracking-[0.03em] uppercase">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {t('search')}
            </a>
          </div>
          <ul className="grid gap-x-8 gap-y-6 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {roots.map((root) => (
              <li key={root.slugs.en} className="flex min-w-0 flex-col gap-1.5">
                <a href={localeHref(locale, categoryPath(root.slugs[locale]))} className={`${LINK} inline-flex items-center gap-2 text-lg font-bold`}>
                  <span aria-hidden="true" className={`${DOT[root.sticker]} size-3 shrink-0 rounded-full border border-black`} />
                  {root.names[locale]}
                </a>
                {root.children.length > 0 && (
                  <ul className="flex flex-col gap-1 pl-5 text-[15px]">
                    {root.children.map((child) => (
                      <li key={child.slugs.en}>
                        <a href={localeHref(locale, categoryPath(child.slugs[locale]))} className={LINK}>
                          {child.names[locale]}
                        </a>
                      </li>
                    ))}
                    {root.more > 0 && (
                      <li>
                        <a href={localeHref(locale, categoryPath(root.slugs[locale]))} className={`${LINK} text-sm font-bold`}>
                          {t('more', { count: root.more, name: root.names[locale] })}
                        </a>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

