'use client';

import type { GeoPlace } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useErrorText } from '@/lib/forms/error-text';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

const DELAY_MS = 400;

type State =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'results'; results: GeoPlace[]; attribution: string }
  | { kind: 'error'; message: string };

/**
 * Address search through the API (`/geo/search`, Nominatim behind it: the site never calls it
 * directly) as a WAI-ARIA combobox: type, then arrows and Enter, or click a place. The OpenStreetMap
 * credit shows under the results, as its licence asks.
 */
export function AddressSearch({
  onSelect,
  disabled,
}: {
  onSelect(place: GeoPlace): void;
  disabled: boolean;
}) {
  const t = useTranslations('builder.place');
  const locale = useLocale();
  const client = useApiClient();
  const errorText = useErrorText();
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [active, setActive] = useState(-1);
  const latest = useRef(0);

  useEffect(() => {
    const query = text.trim();
    if (!open || query.length < 2) return;
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      setState({ kind: 'searching' });
      try {
        const answer = await unwrap(
          client.GET('/api/v1/geo/search', { params: { query: { q: query, lang: locale as 'en' } } }),
        );
        if (ticket !== latest.current) return;
        setState({ kind: 'results', results: answer.results, attribution: answer.attribution });
        setActive(-1);
      } catch (error) {
        if (ticket === latest.current) setState({ kind: 'error', message: errorText(error) });
      }
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, open, client, locale, errorText]);

  const results = state.kind === 'results' ? state.results : [];
  const expanded = open && results.length > 0;

  function choose(place: GeoPlace) {
    latest.current += 1;
    setText(place.label);
    setOpen(false);
    setState({ kind: 'idle' });
    onSelect(place);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter' && expanded && active >= 0) {
      event.preventDefault();
      choose(results[active]!);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Field label={t('search')} hint={t('searchHint')}>
        <input
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          value={text}
          disabled={disabled}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            if (event.target.value.trim().length < 2) setState({ kind: 'idle' });
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={INPUT_CLASS}
        />
      </Field>
      <div role="status" aria-live="polite" className="text-sm">
        {open && state.kind === 'searching' && t('searching')}
        {open &&
          state.kind === 'results' &&
          (state.results.length === 0 ? (
            t('noResults')
          ) : (
            <span className="sr-only">{t('results', { count: state.results.length })}</span>
          ))}
        {state.kind === 'error' && <span className="font-bold">{state.message}</span>}
      </div>
      <div hidden={!expanded} className="border-ink/15 bg-surface rounded-media animate-pop-in border p-2">
        <ul id={listId} role="listbox" aria-label={t('search')}>
          {results.map((place, index) => (
            <li
              key={`${place.lat},${place.lng},${index}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(place)}
              className={`rounded-pill ease-yoyo cursor-pointer px-4 py-2.5 text-sm font-bold transition-colors duration-150 ${
                index === active ? 'bg-cta text-cta-fg' : 'hover:bg-mist'
              }`}
            >
              {place.label}
            </li>
          ))}
        </ul>
        {state.kind === 'results' && <p className="px-4 pt-2 pb-1 text-xs">{state.attribution}</p>}
      </div>
    </div>
  );
}
