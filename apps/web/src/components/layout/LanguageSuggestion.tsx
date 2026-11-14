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
import { Mark } from '@/components/brand/Mark';

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
      {/* v16: a quiet ink bar that floats over the page bottom: the question in the suggested language, the switch, stay. */}
      <div className="bg-ink text-canvas animate-toast-in pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-x-5 gap-y-3 rounded-[28px] py-3 pr-3 pl-5 shadow-[0_24px_48px_-24px_rgba(10,11,14,0.55)] sm:rounded-full">
        <Mark size={22} string={false} className="text-canvas shrink-0 [--mark-cut:var(--ink)]" />
        <p className="m-0 min-w-0 flex-[1_1_14rem] text-[15px] leading-snug font-semibold">{text.text}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={stay}
            className="text-canvas/80 hover:text-canvas rounded-pill inline-flex min-h-10 items-center px-4 text-[13px] font-bold tracking-[0.03em] uppercase underline-offset-4 transition-colors duration-150 hover:underline"
          >
            {text.stay}
          </button>
          <button
            type="button"
            onClick={() => go(suggested)}
            className="bg-canvas text-ink rounded-pill ease-yoyo inline-flex min-h-10 items-center px-5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]"
          >
            {text.switch}
          </button>
        </div>
      </div>
    </section>
  );
}
