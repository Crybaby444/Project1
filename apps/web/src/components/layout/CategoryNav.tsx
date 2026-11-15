'use client';

import type { Locale } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import type { MenuRoot } from '@/lib/catalog/menu';
import { localized } from '@/lib/listings/categories';
import { categoryPath } from '@/lib/seo';

/**
 * The header's second row on wide screens (owner, 2026-11-16: a proper navigation): every root category,
 * each opening a panel of its subcategories on hover, focus or click (a disclosure, not a menu: plain
 * links inside), then the way to "What is Yoyo" and "How it works". Escape closes; one panel at a time.
 */
export function CategoryNav({ roots }: { roots: MenuRoot[] }) {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = useId();
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    const onDown = (e: PointerEvent) => !nav.current?.contains(e.target as Node) && setOpen(null);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, []);

  const enter = (i: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(i), 90);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(null), 160);
  };

  return (
    <nav ref={nav} aria-label={t('categories')} className="relative hidden lg:block" onPointerLeave={leave} onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(null)}>
      <div className="mx-auto flex h-11 max-w-[1440px] items-center gap-1 px-8">
        <button
          type="button"
          aria-expanded={open === -1}
          aria-controls={`${base}-all`}
          onClick={() => setOpen(open === -1 ? null : -1)}
          onPointerEnter={() => enter(-1)}
          className={`rounded-pill ease-yoyo mr-1 inline-flex min-h-8 shrink-0 items-center gap-2 px-3 text-[13.5px] font-bold transition-colors duration-150 ${open === -1 ? 'bg-ink text-canvas' : 'bg-ink/[0.06] hover:bg-ink/[0.1]'}`}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
            <path d="M2 3h12M2 8h12M2 13h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {t('allCategories')}
        </button>
        <ul className="flex min-w-0 flex-1 items-center gap-0.5">
          {roots.map((root, i) => {
            const panel = `${base}-${i}`;
            const href = categoryPath(root.slugs[locale]);
            const active = pathname.startsWith(href);
            return (
              <li key={root.slugs.en} className={`relative ${i >= 4 ? 'hidden xl:block' : ''} ${i >= 6 ? 'xl:hidden 2xl:block' : ''} ${i >= 8 ? '2xl:hidden' : ''}`} onPointerEnter={() => enter(i)}>
                <button
                  type="button"
                  aria-expanded={open === i}
                  aria-controls={panel}
                  onClick={() => setOpen(open === i ? null : i)}
                  className={`rounded-pill ease-yoyo inline-flex min-h-8 items-center gap-1.5 px-3 text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-150 ${
                    open === i || active ? 'bg-ink text-canvas' : 'hover:bg-ink/[0.06]'
                  }`}
                >
                  {localized(root.names, locale)}
                  <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-2.5 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}>
                    <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div
                  id={panel}
                  hidden={open !== i}
                  className="border-ink/15 bg-surface rounded-media animate-pop-in absolute top-[calc(100%+8px)] left-0 z-40 w-72 border p-2 shadow-[0_24px_48px_-24px_rgba(10,11,14,0.45)]"
                >
                  <ul className="flex flex-col">
                    {root.children.map((child) => (
                      <li key={child.slugs.en}>
                        <Link href={categoryPath(child.slugs[locale])} className="hover:bg-ink/[0.05] flex min-h-10 items-center rounded-[12px] px-3 text-[15px] font-medium">
                          {localized(child.names, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href={href} className="border-ink/10 mt-1 flex min-h-10 items-center justify-between rounded-[12px] border-t px-3 pt-1 text-[14px] font-bold">
                    {root.more > 0 ? t('allIn', { count: root.children.length + root.more }) : t('all')}
                    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-4">
                      <path d="M3 9h12M10 4l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
        <ul className="flex shrink-0 items-center gap-0.5 text-[13.5px] font-semibold">
          <li>
            <Link href="/what-is-yoyo" className="hover:bg-ink/[0.06] rounded-pill inline-flex min-h-8 items-center gap-2 px-3">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--glow)] ring-1 ring-black/20" />
              {t('whatIsYoyo')}
            </Link>
          </li>
          <li>
            <Link href="/how-it-works" className="hover:bg-ink/[0.06] rounded-pill inline-flex min-h-8 items-center px-3">
              {t('howItWorks')}
            </Link>
          </li>
        </ul>
      </div>
      <div
        id={`${base}-all`}
        hidden={open !== -1}
        onPointerEnter={() => enter(-1)}
        className="border-ink/15 bg-canvas animate-pop-in absolute inset-x-0 top-full z-40 border-b shadow-[0_30px_60px_-40px_rgba(10,11,14,0.55)]"
      >
        <div className="mx-auto grid max-w-[1440px] grid-cols-4 gap-x-8 gap-y-8 px-8 py-8 2xl:grid-cols-5">
          {roots.map((root) => (
            <div key={root.slugs.en} className="flex flex-col gap-2">
              <Link href={categoryPath(root.slugs[locale])} className="font-display text-[1.45rem] leading-none font-black uppercase hover:underline">
                {localized(root.names, locale)}
              </Link>
              <ul className="flex flex-col">
                {root.children.map((child) => (
                  <li key={child.slugs.en}>
                    <Link href={categoryPath(child.slugs[locale])} className="text-ink/80 hover:text-ink flex min-h-8 items-center text-[14.5px]">
                      {localized(child.names, locale)}
                    </Link>
                  </li>
                ))}
                {root.more > 0 && (
                  <li>
                    <Link href={categoryPath(root.slugs[locale])} className="flex min-h-8 items-center text-[14px] font-bold underline decoration-1 underline-offset-4">
                      {t('more', { count: root.more })}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
