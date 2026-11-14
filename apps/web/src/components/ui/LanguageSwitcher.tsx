'use client';

import { LOCALES, type Locale } from '@yoyo/shared';
import { useSearchParams } from 'next/navigation';
import { flushSync } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import {
  Suspense,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useRememberLocale } from '@/lib/locale/use-locale-choice';
import { EASE_YOYO, prefersReducedMotion } from '@/lib/motion';
import { shouldAnimateLanguageChange, switchLanguage } from './switch-language';

/*
 * Language links are never prefetched. next-intl already skips it for the other languages; the link
 * to the current one (`/en` on an English page, which redirects to `/`) would otherwise be prefetched,
 * and when that prefetch is still on its way as the visitor picks Russian, its redirect resolves under
 * the new `ru` cookie, so "English" afterwards leads back to /ru.
 */

/**
 * Click handler for a language link: a plain click switches through the router inside the language
 * View Transition (see switch-language.ts), keeping the query and the scroll position. A click with
 * a modifier (new tab, new window) or on the current language is left to the link. Next mounts the
 * layout afresh for the new language, which drops the focus on the page body; it goes back to the
 * language pill of the new page.
 */
function useSwitchTo(href: string) {
  const router = useRouter();
  const current = useLocale();
  const remember = useRememberLocale();
  return (event: MouseEvent<HTMLAnchorElement>, locale: string) => {
    if (event.defaultPrevented || !isPlainClick(event) || locale === current) return;
    event.preventDefault();
    remember(locale as Locale);
    void switchLanguage({
      locale,
      navigate: () => router.push(href, { locale, scroll: false }),
      animate: shouldAnimateLanguageChange(
        prefersReducedMotion(),
        typeof document.startViewTransition === 'function',
      ),
      afterSwitch: () => {
        if (document.activeElement && document.activeElement !== document.body) return;
        document
          .querySelector<HTMLElement>('[data-language-focus="menu-button"]')
          ?.focus({ preventScroll: true });
      },
    });
  };
}

/** A click that follows the link here: not one asking for a new tab or window. */
const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** The current page with its query, so a language switch keeps `?token=` of an email link, `?next=`… */
function useHere(): string {
  const pathname = usePathname();
  const query = useSearchParams()?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** The current page without its query: what a statically rendered page shows before it hydrates. */
function HerePath({ children }: { children(href: string): ReactNode }) {
  return children(usePathname());
}

function HereWithQuery({ children }: { children(href: string): ReactNode }) {
  return children(useHere());
}

/**
 * Gives `children` the address of this page in another language. useSearchParams needs a Suspense
 * boundary on static pages; until it resolves, the links keep the path only.
 */
function Here({ children }: { children(href: string): ReactNode }) {
  return (
    <Suspense fallback={<HerePath>{children}</HerePath>}>
      <HereWithQuery>{children}</HereWithQuery>
    </Suspense>
  );
}

/**
 * The language control at every width: a small sticker pill with the current language code that
 * opens a menu of the three languages, each written in its own language (WAI-ARIA menu button with
 * menuitemradio items). It keeps the current page and its query.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  return <Here>{(href) => <LanguageMenu href={href} className={className} />}</Here>;
}

/** Keeps the menu inside the viewport: this far from its edges at least, in px. */
const EDGE = 8;
/** Letters typed within this time make one type-ahead search. */
const TYPEAHEAD_MS = 600;

type Placement = { left: number; above: boolean; originX: number };

function LanguageMenu({ href, className }: { href: string; className: string }) {
  const t = useTranslations('language');
  const current = useLocale();
  const [open, setOpen] = useState(false);
  /** Shown (in the page and visible): true while open and while the closing animation plays. */
  const [shown, setShown] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const focusOn = useRef<'current' | 'first' | 'last'>('current');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const typed = useRef({ text: '', at: 0 });
  const menuId = useId();
  const switchTo = useSwitchTo(href);

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);

  /** Plays the menu in (scale and fade from the pill) or out; nothing when motion is not welcome. */
  const animate = useCallback((direction: 'in' | 'out', done?: () => void) => {
    const menu = menuRef.current;
    animation.current?.cancel();
    animation.current = null;
    if (!menu || typeof menu.animate !== 'function' || prefersReducedMotion()) {
      done?.();
      return;
    }
    const above = menu.dataset['above'] === 'true';
    const hidden = { opacity: 0, transform: `translateY(${above ? 6 : -6}px) scale(0.9)` };
    const visible = { opacity: 1, transform: 'none' };
    const run = menu.animate(direction === 'in' ? [hidden, visible] : [visible, hidden], {
      duration: direction === 'in' ? 220 : 180,
      easing: EASE_YOYO,
      fill: 'both',
    });
    animation.current = run;
    run.onfinish = () => {
      if (animation.current !== run) return;
      animation.current = null;
      done?.();
      run.cancel();
    };
  }, []);

  const openMenu = (where: 'current' | 'first' | 'last') => {
    focusOn.current = where;
    setOpen(true);
    setShown(true);
  };

  const closeMenu = useCallback(
    ({ refocus, instant = false }: { refocus: boolean; instant?: boolean }) => {
      setOpen(false);
      if (refocus) buttonRef.current?.focus({ preventScroll: true });
      if (instant) {
        animation.current?.cancel();
        animation.current = null;
        setShown(false);
      } else {
        animate('out', () => setShown(false));
      }
    },
    [animate],
  );

  // Where the menu goes: under the pill (or above it, when there is no room below), its right edge on
  // the pill's, moved in so it never leaves a 320px screen. Measured before the browser paints.
  useLayoutEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const menu = menuRef.current;
    const button = buttonRef.current;
    if (!root || !menu || !button) return;
    const pill = button.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const viewport = document.documentElement.clientWidth || window.innerWidth;
    const left = Math.max(EDGE, Math.min(pill.right - width, viewport - EDGE - width));
    const below = window.innerHeight - pill.bottom;
    const above = below < height + EDGE && pill.top > below;
    setPlacement({ left: left - box.left, above, originX: pill.left + pill.width / 2 - left });
  }, [open]);

  // Once placed: animate in and put the focus on the current (or first, or last) language. A layout
  // effect, so the first painted frame is already the start of the animation (no flash of the menu).
  useLayoutEffect(() => {
    if (!open || !placement) return;
    const list = items();
    const index =
      focusOn.current === 'first'
        ? 0
        : focusOn.current === 'last'
          ? list.length - 1
          : list.findIndex((item) => item.getAttribute('aria-checked') === 'true');
    list[Math.max(0, index)]?.focus({ preventScroll: true });
    animate('in');
  }, [open, placement, animate]);

  // A click or a tap anywhere else closes the menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu({ refocus: false });
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, closeMenu]);

  useEffect(() => () => animation.current?.cancel(), []);

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(event.key === 'ArrowDown' ? 'first' : 'last');
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      list[(to + list.length) % list.length]?.focus({ preventScroll: true });
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(list.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu({ refocus: true });
    } else if (event.key === 'Tab') {
      closeMenu({ refocus: false });
    } else if (event.key === ' ') {
      // Links answer Enter by themselves; a menu item answers Space too.
      event.preventDefault();
      (document.activeElement as HTMLElement | null)?.click();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Type-ahead: the next language whose name (or code) starts with what was typed.
      const now = Date.now();
      const key = event.key.toLocaleLowerCase();
      const find = (text: string, from: number) => {
        const order = [...list.slice(from), ...list.slice(0, from)];
        return order.find((item) =>
          [item.textContent ?? '', item.getAttribute('lang') ?? ''].some((label) =>
            label.toLocaleLowerCase().startsWith(text),
          ),
        );
      };
      let text = now - typed.current.at < TYPEAHEAD_MS ? typed.current.text + key : key;
      // More letters refine the search from the item in focus; one letter moves on to the next match.
      let found = text.length > 1 ? find(text, Math.max(0, index)) : find(text, index + 1);
      if (!found && text.length > 1) {
        text = key;
        found = find(text, index + 1);
      }
      typed.current = { text, at: now };
      if (found) {
        event.preventDefault();
        found.focus({ preventScroll: true });
      }
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-language-focus="menu-button"
        onClick={() => (open ? closeMenu({ refocus: false }) : openMenu('current'))}
        onKeyDown={onButtonKeyDown}
        className="group border-ink bg-surface text-ink rounded-pill ease-yoyo aria-expanded:bg-mist inline-flex h-10 min-w-10 items-center justify-center gap-1.5 border px-2.5 text-[12px] font-bold tracking-[0.06em] uppercase transition-transform duration-150 select-none hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.94] sm:pr-2 sm:pl-1.5"
      >
        <LanguageSticker />
        {/* The name says the language in full and still contains the visible code (WCAG 2.5.3). */}
        <span className="sr-only">{t('current', { name: t(current) })}, </span>
        <span className="tabular-nums">{current}</span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="ease-yoyo hidden size-3 transition-transform duration-[250ms] group-aria-expanded:rotate-180 sm:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={t('label')}
        hidden={!shown}
        data-above={placement?.above ? 'true' : 'false'}
        onKeyDown={onMenuKeyDown}
        style={
          placement
            ? {
                left: placement.left,
                transformOrigin: `${placement.originX}px ${placement.above ? '100%' : '0'}`,
              }
            : { right: 0 }
        }
        className={`border-ink/15 bg-surface rounded-media absolute z-40 flex w-48 flex-col gap-0.5 border p-1.5 [filter:drop-shadow(0_0_0.6px_var(--sticker-edge))] ${
          placement?.above ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
      >
        {LOCALES.map((locale) => {
          const checked = locale === current;
          return (
            <Link
              key={locale}
              href={href}
              locale={locale}
              prefetch={false}
              hrefLang={locale}
              lang={locale}
              role="menuitemradio"
              aria-checked={checked}
              tabIndex={-1}
              onClick={(event) => {
                if (!isPlainClick(event)) return; // a new tab or window: the menu stays
                if (checked) event.preventDefault();
                // Closed before the switch starts, so the page the transition captures has no menu.
                flushSync(() => closeMenu({ refocus: true, instant: true }));
                switchTo(event, locale);
              }}
              className={`rounded-pill ease-yoyo hover:bg-mist focus-visible:bg-mist flex min-h-10 items-center gap-3 px-3 text-[14px] font-bold outline-offset-0 transition-[background-color,transform] duration-150 select-none active:scale-[0.98]`}
            >
              <span className="flex-1">{t(locale)}</span>
              <span aria-hidden="true" className="text-ink/60 text-[11px] tracking-[0.06em] uppercase">
                {locale}
              </span>
              <CheckSticker visible={checked} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** A tiny globe sticker (Sunburst, ink outline) that wobbles when the pill is hovered. */
function LanguageSticker() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="hidden size-[18px] shrink-0 sm:block"
    >
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="10" cy="10" rx="3.6" ry="8.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.8 7.2h16.4M1.8 12.8h16.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/** The check of the current language: a small mint sticker; the others keep its room, empty. */
function CheckSticker({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`size-5 shrink-0 ${visible ? '' : 'invisible'}`}>
      <circle cx="10" cy="10" r="8.5" fill="var(--glow)" stroke="#000" strokeWidth="1" />
      <path
        d="m6 10.3 2.7 2.7L14 7.6"
        fill="none"
        stroke="#000"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
