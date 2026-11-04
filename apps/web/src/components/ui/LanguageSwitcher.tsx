'use client';

import { LOCALES } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link, usePathname } from '@/i18n/navigation';

/** Pill switcher between EN / LV / RU that keeps the current page. */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')}>
      <ul className="flex flex-wrap justify-center gap-1 rounded-pill border border-ink bg-surface p-1">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                className={`inline-flex min-h-10 items-center rounded-pill px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-[background-color,color,transform] duration-200 ease-yoyo active:scale-[0.97] ${
                  active ? 'bg-cta text-cta-fg' : 'hover:-translate-y-px hover:bg-mist'
                }`}
              >
                {t(locale)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The same choice folded into one round button, for narrow headers: shows the current language,
 * opens a short list of the others. Esc or a click elsewhere closes it.
 */
export function LanguageMenu({ className = '' }: { className?: string }) {
  const t = useTranslations('language');
  const current = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <nav ref={rootRef} aria-label={t('label')} onKeyDown={onKeyDown} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="border-ink bg-surface text-ink inline-grid size-10 place-items-center rounded-pill border text-[12px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 ease-yoyo hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.94]"
      >
        {/* The name says the language in full and still contains the visible code (WCAG 2.5.3). */}
        <span className="sr-only">{t('current', { name: t(current) })}, </span>
        {current}
      </button>
      {open && (
        <ul
          id={listId}
          className="border-ink bg-surface animate-pop-in absolute top-full right-0 z-40 mt-2 flex min-w-40 origin-top-right flex-col gap-1 rounded-card border p-1"
        >
          {LOCALES.map((locale) => {
            const active = locale === current;
            return (
              <li key={locale}>
                <Link
                  href={pathname}
                  locale={locale}
                  hrefLang={locale}
                  lang={locale}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-10 items-center rounded-pill px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-colors duration-150 ease-yoyo ${
                    active ? 'bg-cta text-cta-fg' : 'hover:bg-mist'
                  }`}
                >
                  {t(locale)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
