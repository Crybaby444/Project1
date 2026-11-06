'use client';

import type { Locale, SuggestResponse } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { localized } from '@/lib/listings/categories';
import { categoryPath, listingPath } from '@/lib/seo';
import { useApiClient } from '@/lib/session/SessionProvider';

/** Suggestions wait this long after the last key. */
export const SUGGEST_DELAY_MS = 200;

type Option =
  | { kind: 'category'; key: string; label: string; href: string; sticker: string }
  | { kind: 'listing'; key: string; label: string; href: string; cover: string | null };

const STICKER_BG: Record<string, string> = {
  blue: 'bg-sticker-blue',
  mint: 'bg-sticker-mint',
  lavender: 'bg-sticker-lavender',
  ember: 'bg-sticker-ember',
  sun: 'bg-sticker-sun',
  violet: 'bg-sticker-violet',
};

function optionsOf(answer: SuggestResponse | null, locale: Locale): Option[] {
  if (!answer) return [];
  return [
    ...answer.categories.map((c): Option => ({
      kind: 'category',
      key: `c-${c.slug}`,
      label: localized(c.names, locale),
      href: categoryPath(c.slugs[locale]),
      sticker: c.sticker,
    })),
    ...answer.listings.map((l): Option => ({ kind: 'listing', key: `l-${l.id}`, label: l.title, href: listingPath(l.id, l.title), cover: l.cover?.thumb ?? null })),
  ];
}

/**
 * The catalog's search box with suggestions (WAI-ARIA 1.2 combobox, list autocomplete): categories by
 * their name in any language and items by title, 200 ms after the last key, each new request
 * cancelling the last. Arrows move through the suggestions, Enter opens one or searches the text, Esc
 * closes the list and a second Esc clears the box.
 */
export function SearchBox({ initialQuery = '', className = '' }: { initialQuery?: string; className?: string }) {
  const t = useTranslations('catalog.search');
  const locale = useLocale() as Locale;
  const client = useApiClient();
  const router = useRouter();
  const ids = { input: useId(), list: useId(), categories: useId(), listings: useId() };
  const [text, setText] = useState(initialQuery);
  const [open, setOpen] = useState(false);
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
  const expanded = open && options.length > 0;
  const categories = options.filter((o) => o.kind === 'category');
  const listings = options.filter((o) => o.kind === 'listing');

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const query = text.trim();
    go(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === 'Enter' && expanded && active >= 0) {
      event.preventDefault();
      go(options[active]!.href);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (expanded) setOpen(false);
      else {
        setText('');
        setAnswer(null);
      }
    }
  }

  const optionId = (index: number) => `${ids.list}-${index}`;
  const renderOption = (option: Option) => {
    const index = options.indexOf(option);
    const selected = index === active;
    return (
      <li
        key={option.key}
        id={optionId(index)}
        role="option"
        aria-selected={selected}
        onPointerDown={(event) => event.preventDefault()}
        onPointerEnter={() => setActive(index)}
        onClick={() => go(option.href)}
        className={`rounded-pill ease-yoyo flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 text-sm font-bold transition-colors duration-150 ${selected ? 'bg-cta text-cta-fg' : ''}`}
      >
        {option.kind === 'category' ? (
          <span aria-hidden="true" className={`size-4 shrink-0 rounded-full border border-black ${STICKER_BG[option.sticker] ?? 'bg-mist'}`} />
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
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <label htmlFor={ids.input} className="sr-only">
        {t('label')}
      </label>
      <div className="border-ink bg-surface rounded-pill focus-within:outline-ink flex min-h-12 items-center gap-2 border py-1 pr-1 pl-4 focus-within:outline-2 focus-within:outline-offset-3">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <input
          id={ids.input}
          type="search"
          role="combobox"
          autoComplete="off"
          enterKeyHint="search"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={ids.list}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          placeholder={t('placeholder')}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/60 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            aria-label={t('clear')}
            onClick={() => {
              setText('');
              setAnswer(null);
            }}
            className="hover:bg-mist ease-yoyo grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-150 active:scale-90"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          className="bg-cta text-cta-fg border-cta rounded-pill ease-yoyo min-h-10 shrink-0 border px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {t('submit')}
        </button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {open && text.trim().length >= 2 && !loading && answer ? (options.length > 0 ? t('count', { count: options.length }) : t('none')) : ''}
      </p>
      <div hidden={!expanded} className="border-ink bg-surface rounded-card animate-pop-in absolute inset-x-0 top-full z-30 mt-2 origin-top border p-2">
        <ul id={ids.list} role="listbox" aria-label={t('label')} className="flex flex-col gap-1">
          {categories.length > 0 && (
            <li role="presentation">
              <p id={ids.categories} className="px-3 pt-1 pb-1 text-[12px] font-bold tracking-[0.032em] uppercase">
                {t('categories')}
              </p>
              <ul role="group" aria-labelledby={ids.categories}>
                {categories.map(renderOption)}
              </ul>
            </li>
          )}
          {listings.length > 0 && (
            <li role="presentation">
              <p id={ids.listings} className="px-3 pt-2 pb-1 text-[12px] font-bold tracking-[0.032em] uppercase">
                {t('items')}
              </p>
              <ul role="group" aria-labelledby={ids.listings}>
                {listings.map(renderOption)}
              </ul>
            </li>
          )}
        </ul>
      </div>
    </form>
  );
}
