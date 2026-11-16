'use client';

import { useTranslations } from 'next-intl';
import { usePeopleSearch } from '@/lib/people/queries';
import { PersonCard } from './PersonCard';

/** On the search page: people whose name matches the words, above the items. */
export function PeopleResults({ q }: { q: string }) {
  const t = useTranslations('people');
  const people = usePeopleSearch(q);
  if (!people.data || people.data.length === 0) return null;
  return (
    <section aria-labelledby="people-results" className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 pt-8 sm:px-8" data-people-results="">
      <h2 id="people-results" className="font-display text-4xl leading-none font-black uppercase">
        {t('searchTitle')}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.data.slice(0, 6).map((p) => (
          <PersonCard key={p.id} person={p} />
        ))}
      </ul>
    </section>
  );
}
