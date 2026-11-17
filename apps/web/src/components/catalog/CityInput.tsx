'use client';

import { useQuery } from '@tanstack/react-query';
import type { Country } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

export type CityChoice = { name: string; slug: string };

/**
 * Where, typed (owner, 2026-11-16: every city of the country, with autocomplete; search by city, not
 * district). A WAI-ARIA combobox: arrows move through the suggestions, Enter takes one, Escape closes;
 * leaving the field with text that is not a city takes the first suggestion, an empty field means "anywhere".
 */
export function CityInput({
  id,
  country,
  value,
  onChange,
  className = '',
  placeholder,
}: {
  id: string;
  country: Country;
  value: CityChoice | null;
  onChange: (city: CityChoice | null) => void;
  className?: string;
  placeholder?: string;
}) {
  const t = useTranslations('market.search');
  const client = useApiClient();
  const listId = useId();
  const [text, setText] = useState(value?.name ?? '');
  const [typed, setTyped] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setTyped(text.trim()), 140);
    return () => clearTimeout(timer);
  }, [text]);

  const suggestions = useQuery({
    queryKey: ['catalog', 'cities', country, typed],
    enabled: typed.length > 0 && typed !== value?.name,
    staleTime: 10 * 60_000,
    queryFn: () => unwrap(client.GET('/api/v1/catalog/cities', { params: { query: { country, q: typed } } })),
  });
  const items = suggestions.data?.items ?? [];
  const showing = open && items.length > 0;

  function choose(city: CityChoice | null) {
    onChange(city);
    setText(city?.name ?? '');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (items.length) setActive((i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (event.key === 'Enter' && showing) {
      event.preventDefault();
      const city = items[active];
      if (city) choose({ name: city.name, slug: city.slug });
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={showing ? `${listId}-${active}` : undefined}
        value={text}
        placeholder={placeholder ?? t('anywhere')}
        onChange={(event) => {
          setText(event.target.value);
          setActive(0);
          setOpen(true);
          if (!event.target.value.trim()) onChange(null);
        }}
        onFocus={() => text && setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // A typed name that matches a suggestion becomes that city; anything else is cleared back.
          setTimeout(() => {
            setOpen(false);
            if (!text.trim()) return choose(null);
            if (value && text === value.name) return;
            const first = items[0];
            if (first) choose({ name: first.name, slug: first.slug });
            else setText(value?.name ?? '');
          }, 120);
        }}
        className={`placeholder:text-ink/60 w-full min-w-0 bg-transparent outline-none ${className}`}
      />
      {showing && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('where')}
          className="border-ink/15 bg-surface rounded-media animate-pop-in absolute top-[calc(100%+12px)] left-0 z-30 w-[min(86vw,320px)] overflow-hidden border p-1.5 shadow-[0_32px_64px_-32px_rgba(10,11,14,0.5)]"
        >
          {items.map((city, index) => (
            <li
              key={city.slug}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onPointerDown={(event) => {
                event.preventDefault();
                choose({ name: city.name, slug: city.slug });
              }}
              onPointerEnter={() => setActive(index)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-[14px] px-3.5 py-2.5 text-base font-semibold ${index === active ? 'bg-ink text-canvas' : ''}`}
            >
              <span className="truncate">{city.name}</span>
              {city.count > 0 && <span className={`shrink-0 text-sm tabular-nums ${index === active ? 'text-canvas/70' : 'text-ink/60'}`}>{t('cityCount', { count: city.count })}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
