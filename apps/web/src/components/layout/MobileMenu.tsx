'use client';

import type { Locale } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SearchBox } from '@/components/catalog/SearchBox';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Link } from '@/i18n/navigation';
import type { MenuRoot } from '@/lib/catalog/menu';
import { localized } from '@/lib/listings/categories';
import { categoryPath } from '@/lib/seo';

/**
 * Below the wide layout: a menu button that opens a full-height sheet from the left (a modal dialog with
 * focus kept inside): search, every category with its subcategories, What is Yoyo, How it works, the theme.
 */
export function MobileMenu({ roots }: { roots: MenuRoot[] }) {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={t('menu')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="hover:bg-ink/[0.06] rounded-pill inline-grid size-10 shrink-0 place-items-center lg:hidden"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
          <path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        aria-label={t('menu')}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="bg-canvas text-ink m-0 h-dvh max-h-none w-[min(92vw,420px)] max-w-none overflow-y-auto p-0 backdrop:bg-[color-mix(in_srgb,var(--night)_55%,transparent)] open:animate-[sheet-in_260ms_var(--ease-yoyo)]"
      >
        <div className="flex flex-col gap-6 px-5 pt-4 pb-10" onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}>
          <div className="flex items-center justify-between">
            <span className="font-display text-[1.8rem] leading-none font-black uppercase">{t('menu')}</span>
            <button type="button" aria-label={t('close')} onClick={() => setOpen(false)} className="hover:bg-ink/[0.06] rounded-pill inline-grid size-10 place-items-center">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <SearchBox compact />
          <nav aria-label={t('categories')}>
            <ul className="border-ink/15 divide-ink/10 divide-y border-y">
              {roots.map((root) => {
                const key = root.slugs.en;
                const isOpen = expanded === key;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : key)}
                      className="flex min-h-14 w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="font-display text-[1.6rem] leading-none font-black uppercase">{localized(root.names, locale)}</span>
                      <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isOpen && (
                      <ul className="flex flex-col pb-3">
                        {root.children.map((child) => (
                          <li key={child.slugs.en}>
                            <Link href={categoryPath(child.slugs[locale])} className="flex min-h-11 items-center pl-1 text-[16px]">
                              {localized(child.names, locale)}
                            </Link>
                          </li>
                        ))}
                        <li>
                          <Link href={categoryPath(root.slugs[locale])} className="flex min-h-11 items-center pl-1 text-[15px] font-bold underline decoration-1 underline-offset-4">
                            {t('all')}
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
          <ul className="flex flex-col gap-1 text-[17px] font-semibold">
            <li>
              <Link href="/what-is-yoyo" className="flex min-h-11 items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-full bg-[var(--glow)] ring-1 ring-black/20" />
                {t('whatIsYoyo')}
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="flex min-h-11 items-center">
                {t('howItWorks')}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="flex min-h-11 items-center">
                {t('faq')}
              </Link>
            </li>
          </ul>
          <ThemeToggle className="self-start" />
        </div>
      </dialog>
    </>
  );
}
