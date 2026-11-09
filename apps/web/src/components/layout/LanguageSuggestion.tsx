'use client';

import type { Locale } from '@yoyo/shared';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { shouldAnimateLanguageChange, switchLanguage } from '@/components/ui/switch-language';
import { usePathname, useRouter } from '@/i18n/navigation';
import { readLocaleChoice, suggestLocale } from '@/lib/locale/choice';
import { useRememberLocale } from '@/lib/locale/use-locale-choice';
import { prefersReducedMotion } from '@/lib/motion';
import TEXTS from '../../../messages/language-suggestion.json';

/**
 * The polite alternative to a language redirect: every URL serves its own language, and on a first
 * visit whose browser prefers another language the site has (navigator.languages), a small bar asks,
 * in that language, whether to switch. Either answer is remembered (NEXT_LOCALE cookie, and the
 * profile when signed in), so it asks once. It never switches on its own.
 *
 * It sits at the bottom of the screen over the page, so showing it after hydration moves nothing.
 */
export function LanguageSuggestion() {
  const pageLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const remember = useRememberLocale();
  const [suggested, setSuggested] = useState<Locale | null>(null);

  useEffect(() => {
    // What the browser prefers is only known here, after hydration.
    const next = readLocaleChoice()
      ? null
      : suggestLocale(navigator.languages ?? [navigator.language], pageLocale);
    const frame = requestAnimationFrame(() => setSuggested(next));
    return () => cancelAnimationFrame(frame);
  }, [pageLocale]);

  if (!suggested) return null;
  const text = TEXTS[suggested];

  function stay() {
    remember(pageLocale);
    setSuggested(null);
  }

  function go(locale: Locale) {
    remember(locale);
    setSuggested(null);
    const here = `${pathname}${window.location.search}`;
    void switchLanguage({
      locale,
      navigate: () => router.push(here, { locale, scroll: false }),
      animate: shouldAnimateLanguageChange(
        prefersReducedMotion(),
        typeof document.startViewTransition === 'function',
      ),
    });
  }

  return (
    <section
      lang={suggested}
      aria-label={text.label}
      data-language-suggestion=""
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="border-ink bg-surface text-ink rounded-card animate-toast-in pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-x-4 gap-y-3 border p-4">
        <p className="min-w-0 flex-[1_1_16rem] text-[15px] leading-snug font-bold">{text.text}</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => go(suggested)}
            className="border-cta bg-cta text-cta-fg rounded-pill ease-yoyo inline-flex min-h-10 items-center border px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]"
          >
            {text.switch}
          </button>
          <button
            type="button"
            onClick={stay}
            className="border-ink bg-surface text-ink hover:bg-mist rounded-pill ease-yoyo inline-flex min-h-10 items-center border px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-[transform,background-color] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]"
          >
            {text.stay}
          </button>
        </div>
      </div>
    </section>
  );
}
