'use client';

import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { SuggestionList, suggestionKey, useSuggestions } from './suggestions';

export { SUGGEST_DELAY_MS } from './suggestions';

/**
 * The catalog's search box with suggestions (WAI-ARIA 1.2 combobox, list autocomplete): categories by
 * their name in any language and items by title, 200 ms after the last key, each new request
 * cancelling the last. Arrows move through the suggestions, Enter opens one or searches the text, Esc
 * closes the list and a second Esc clears the box.
 */
export function SearchBox({ initialQuery = '', className = '', compact = false, label }: { initialQuery?: string; className?: string; /** The header's slim box: 40px tall, Enter searches (no button). */ compact?: boolean; /** Its own accessible name, when another search box is on the page. */ label?: string }) {
  const t = useTranslations('catalog.search');
  const router = useRouter();
  const ids = { input: useId(), list: useId() };
  const [text, setText] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const { answer, loading, options, active, setActive, clear } = useSuggestions(text, open);
  const expanded = open && options.length > 0;

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
    if (suggestionKey(event.key, { options, active, setActive, expanded, open: () => setOpen(true), pick: go })) event.preventDefault();
    else if (event.key === 'Escape') {
      event.preventDefault();
      if (expanded) setOpen(false);
      else {
        setText('');
        clear();
      }
    }
  }

  const optionId = (index: number) => `${ids.list}-${index}`;

  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <label htmlFor={ids.input} className="sr-only">
        {label ?? t('label')}
      </label>
      <div className={`bg-surface rounded-pill focus-within:outline-accent flex items-center gap-2 border pr-1 pl-4 focus-within:outline-2 focus-within:outline-offset-3 ${compact ? 'border-ink/25 hover:border-ink/60 min-h-10 py-0.5 transition-colors' : 'border-ink min-h-12 py-1'}`}>
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
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink/60 [&::-webkit-search-cancel-button]:hidden ${compact ? 'text-base' : 'text-base'}`}
        />
        {text && (
          <button
            type="button"
            aria-label={t('clear')}
            onClick={() => {
              setText('');
              clear();
            }}
            className="hover:bg-mist ease-yoyo grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-150 active:scale-90"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {!compact && (
          <button
            type="submit"
            className="bg-cta text-cta-fg border-cta rounded-pill ease-yoyo min-h-10 shrink-0 border px-4 text-sm font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            {t('submit')}
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {open && text.trim().length >= 2 && !loading && answer ? (options.length > 0 ? t('count', { count: options.length }) : t('none')) : ''}
      </p>
      <SuggestionList id={ids.list} options={options} active={active} onActive={setActive} onPick={go} hidden={!expanded} className="inset-x-0 top-full mt-2" />
    </form>
  );
}
