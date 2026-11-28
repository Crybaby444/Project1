import type { PeopleResponse } from '@yoyo/shared';
import { getTranslations } from 'next-intl/server';
import type { Loaded } from '@/lib/catalog/server-api';
import { initials } from '@/components/item/OwnerCard';
import { Link } from '@/i18n/navigation';

/** At most this many: the row is a way to someone's profile, not a directory. */
const SHOWN = 6;

/**
 * On the search page, above the items: the people the words also found (owner, 2026-11-28: finding people
 * lives in the one search, not on the profile). Small pills that lead to the person's profile, one row that
 * scrolls sideways on a phone. Nothing when nobody matched.
 */
export async function PeopleResults({ found }: { found: Promise<Loaded<PeopleResponse>> }) {
  const [t, answer] = await Promise.all([getTranslations('people'), found]);
  const people = answer.ok ? answer.data.items : [];
  if (people.length === 0) return null;
  return (
    <section aria-labelledby="people-results" className="flex flex-col gap-3" data-people-results="">
      <h2 id="people-results" className="type-label text-ink/70">
        {t('searchTitle')}
      </h2>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {people.slice(0, SHOWN).map((person) => {
          const handle = person.username && person.name !== `@${person.username}` ? `@${person.username}` : null;
          const meta = [handle, t('itemsCount', { count: person.listingCount })].filter(Boolean).join(' · ');
          return (
            <li key={person.id} className="shrink-0 snap-start">
              <Link
                href={`/u/${person.id}`}
                className="border-ink/15 hover:border-ink/50 bg-surface rounded-pill ease-yoyo flex min-h-14 max-w-[18rem] items-center gap-3 border py-2 pr-5 pl-2 transition-[border-color,transform] duration-200 hover:-translate-y-0.5"
                data-person={person.id}
              >
                <span aria-hidden="true" className="bg-ink text-canvas font-display grid size-10 shrink-0 place-items-center rounded-full text-lg font-black">
                  {initials(person.name)}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-bold">{person.name}</span>
                  <span className="text-ink/65 truncate text-xs font-semibold">{meta}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
