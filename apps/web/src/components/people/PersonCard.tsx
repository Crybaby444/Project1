'use client';

import type { PersonCard as Person } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FollowButton } from './FollowButton';

/** A person in search results and follow lists: initials, name, city, items and followers, Follow. */
export function PersonCard({ person }: { person: Person }) {
  const t = useTranslations('people');
  const initials = person.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <li className="border-ink/15 bg-surface rounded-media flex items-center gap-4 border p-4" data-person={person.id}>
      <span aria-hidden="true" className="bg-ink text-canvas font-display grid size-14 shrink-0 place-items-center rounded-full text-2xl font-black">
        {initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/u/${person.id}`} className="truncate font-bold underline-offset-4 hover:underline">
          {person.name}
        </Link>
        <span className="text-ink/70 truncate text-sm">
          {[person.username ? `@${person.username}` : null, person.city, t('itemsCount', { count: person.listingCount }), t('followers', { count: person.followers })].filter(Boolean).join(' · ')}
        </span>
      </div>
      <FollowButton userId={person.id} name={person.name} />
    </li>
  );
}
