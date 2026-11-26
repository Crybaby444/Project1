'use client';

import type { Locale, SuggestResponse } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { localized } from '@/lib/listings/categories';
import { categoryPath, listingPath } from '@/lib/seo';
import { useApiClient } from '@/lib/session/SessionProvider';

/** Suggestions wait this long after the last key. */
export const SUGGEST_DELAY_MS = 200;

export type SuggestOption =
  | { kind: 'category'; key: string; label: string; href: string; sticker: string }
  | { kind: 'listing'; key: string; label: string; href: string; cover: string | null };

function optionsOf(answer: SuggestResponse | null, locale: Locale): SuggestOption[] {
  if (!answer) return [];
  return [
    ...answer.categories.map((c): SuggestOption => ({
      kind: 'category',
      key: `c-${c.slug}`,
      label: localized(c.names, locale),
      href: categoryPath(c.slugs[locale]),
      sticker: c.sticker,
    })),
    ...answer.listings.map((l): SuggestOption => ({ kind: 'listing', key: `l-${l.id}`, label: l.title, href: listingPath(l.id, l.title), cover: l.cover?.thumb ?? null })),
  ];
}

/**
 * Categories by their name in any language and items by title for what is typed: 200 ms after the last
 * key, each new request cancelling the last, answers kept per text. Shared by the header's search box
 * and the home's "What" field (owner, 2026-11-19: the home field had none).
 */
export function useSuggestions(text: string, open: boolean) {
  const locale = useLocale() as Locale;
  const client = useApiClient();
  const [answer, setAnswer] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const cache = useRef(new Map<string, SuggestResponse>());

  useEffect(() => {
    const query = text.trim();
    if (!open || query.length < 2) return;
    const key = `${locale}:${query.toLowerCase()}`;
    const cached = cache.current.get(key);
    if (cached) {
      setAnswer(cached);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await client.GET('/api/v1/catalog/suggest', { params: { query: { q: query, lang: locale } }, signal: controller.signal });
        if (controller.signal.aborted || !data) return;
        cache.current.set(key, data);
        setAnswer(data);
        setActive(-1);
      } catch {
        // A cancelled or failed suggestion is not an error to show: the search itself still works.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SUGGEST_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, open, client, locale]);

  const options = text.trim().length >= 2 ? optionsOf(answer, locale) : [];
  return { answer, loading, options, active, setActive, clear: () => setAnswer(null) };
}

/** The list under a search field: categories, then items, as WAI-ARIA options of one listbox. */
export function SuggestionList({
  id,
  options,
  active,
  onActive,
  onPick,
  hidden,
  className = '',
}: {
  id: string;
  options: SuggestOption[];
  active: number;
  onActive(index: number): void;
  onPick(href: string): void;
  hidden: boolean;
  className?: string;
}) {
  const t = useTranslations('catalog.search');
  const categories = options.filter((o) => o.kind === 'category');
  const listings = options.filter((o) => o.kind === 'listing');
  const renderOption = (option: SuggestOption) => {
    const index = options.indexOf(option);
    const selected = index === active;
    return (
      <li
        key={option.key}
        id={`${id}-${index}`}
        role="option"
        aria-selected={selected}
        onPointerDown={(event) => event.preventDefault()}
        onPointerEnter={() => onActive(index)}
        onClick={() => onPick(option.href)}
        className={`rounded-pill ease-yoyo flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 text-sm font-bold transition-colors duration-150 ${selected ? 'bg-cta text-cta-fg' : ''}`}
      >
        {option.kind === 'category' ? (
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[var(--glow)] ring-1 ring-black/15" />
        ) : option.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- a 160×120 thumbnail from the API's storage
          <img src={option.cover} alt="" width={40} height={30} className="border-ink rounded-[6px] h-[30px] w-10 shrink-0 border object-cover" />
        ) : (
          <span aria-hidden="true" className="bg-mist border-ink h-[30px] w-10 shrink-0 rounded-[6px] border" />
        )}
        <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
      </li>
    );
  };
  return (
    <div hidden={hidden} className={`border-ink/15 bg-surface rounded-media animate-pop-in shadow-pop absolute z-30 origin-top border p-2 ${className}`}>
      <ul id={id} role="listbox" aria-label={t('label')} className="flex flex-col gap-1">
        {categories.length > 0 && (
          <li role="presentation">
            <p id={`${id}-categories`} className="px-3 pt-1 pb-1 type-caption">
              {t('categories')}
            </p>
            <ul role="group" aria-labelledby={`${id}-categories`}>
              {categories.map(renderOption)}
            </ul>
          </li>
        )}
        {listings.length > 0 && (
          <li role="presentation">
            <p id={`${id}-listings`} className="px-3 pt-2 pb-1 type-caption">
              {t('items')}
            </p>
            <ul role="group" aria-labelledby={`${id}-listings`}>
              {listings.map(renderOption)}
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Arrow keys move through the options, Enter on one opens it; answers whether the key was used. */
export function suggestionKey(
  key: string,
  { options, active, setActive, expanded, open, pick }: { options: SuggestOption[]; active: number; setActive(fn: (i: number) => number): void; expanded: boolean; open(): void; pick(href: string): void },
): boolean {
  if (key === 'ArrowDown' && options.length > 0) {
    open();
    setActive((index) => (index + 1) % options.length);
    return true;
  }
  if (key === 'ArrowUp' && options.length > 0) {
    open();
    setActive((index) => (index <= 0 ? options.length - 1 : index - 1));
    return true;
  }
  if (key === 'Enter' && expanded && active >= 0) {
    pick(options[active]!.href);
    return true;
  }
  return false;
}
