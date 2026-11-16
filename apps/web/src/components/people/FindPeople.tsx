'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { usePeopleSearch } from '@/lib/people/queries';
import { PersonCard } from './PersonCard';

/** Find people by name or @username to follow them (owner, 2026-11-16: there was no way to). */
export function FindPeople() {
  const t = useTranslations('people');
  const id = useId();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQ(text), 250);
    return () => clearTimeout(timer);
  }, [text]);
  const people = usePeopleSearch(q);
  const words = q.trim();
  return (
    <div className="flex flex-col gap-4" data-find-people="">
      <label htmlFor={id} className="sr-only">
        {t('findLabel')}
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t('findPlaceholder')}
        autoComplete="off"
        className="border-ink/25 bg-surface focus:border-ink rounded-pill min-h-12 w-full border px-5 text-[16px] outline-none"
      />
      {words.length < 2 ? (
        <p className="text-ink/70 text-sm">{t('findHint')}</p>
      ) : people.isPending ? (
        <p className="text-ink/70 text-sm">{t('findLoading')}</p>
      ) : (people.data ?? []).length === 0 ? (
        <p className="text-ink/70 text-sm">{t('findNone', { q: words })}</p>
      ) : (
        <ul className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
          {(people.data ?? []).map((person) => (
            <li key={person.id}>
              <PersonCard person={person} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
