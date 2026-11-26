'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ShareButton } from '@/components/catalog/ShareButton';
import { MessageOwnerButton } from '@/components/chat/MessageOwnerButton';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Link } from '@/i18n/navigation';
import { usePeopleOf } from '@/lib/people/queries';
import { useSession } from '@/lib/session/SessionProvider';
import { FindPeople } from './FindPeople';
import { FollowButton } from './FollowButton';
import { PersonCard } from './PersonCard';

type List = 'followers' | 'following' | 'find';

/**
 * The profile's social row (owner, 2026-11-16: a full profile). Followers and following open their
 * lists; reviews jump to the reviews tab. On someone else's profile: Follow and Write. On your own:
 * Edit profile and Manage my items instead.
 */
export function ProfileSocial({
  userId,
  name,
  followers,
  following,
  reviews,
  deals,
  tone = 'light',
}: {
  userId: string;
  name: string;
  followers: number;
  following: number;
  reviews: number;
  deals: number;
  /** `night`: on the profile's dark band (light text, light buttons). */
  tone?: 'light' | 'night';
}) {
  const night = tone === 'night';
  const t = useTranslations('people');
  const tp = useTranslations('profile');
  const { user } = useSession();
  const mine = user?.id === userId;
  const [delta, setDelta] = useState(0);
  const [open, setOpen] = useState<List | null>(null);
  const people = usePeopleOf(userId, open === 'find' ? null : open);

  const stat = (value: number, label: string, onClick?: () => void) => {
    const inner = (
      <>
        <span className="font-display block text-[1.75rem] leading-none font-black tabular-nums sm:text-4xl">{value}</span>
        <span className={`block text-sm font-semibold ${night ? 'text-[var(--paper)]/70' : 'text-ink/70'}`}>{label}</span>
      </>
    );
    return onClick ? (
      <button type="button" onClick={onClick} className="min-w-0 rounded-md text-left transition-opacity hover:opacity-80">
        {inner}
      </button>
    ) : (
      <div className="min-w-0">{inner}</div>
    );
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-8 gap-y-5 ${night ? '[--cta-bg:var(--paper)] [--cta-fg:var(--night)] text-[var(--paper)]' : ''}`} data-profile-social="">
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-4 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
        {stat(deals, tp('deals', { count: deals }))}
        {stat(followers + delta, t('followers', { count: followers + delta }), () => setOpen('followers'))}
        {stat(following, t('followingCount'), () => setOpen('following'))}
        {stat(reviews, t('reviews', { count: reviews }))}
      </div>
      <div className="flex flex-wrap gap-2">
        {mine ? (
          <>
            <Button href="/settings" size="md">
              {tp('edit')}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setOpen('find')}>
              {tp('findPeople')}
            </Button>
            <ShareButton title={name} withoutQuery />
          </>
        ) : (
          <>
            <FollowButton userId={userId} name={name} onChange={(on) => setDelta((d) => d + (on ? 1 : -1))} />
            <MessageOwnerButton ownerId={userId} label={t('write')} size="md" />
            <ShareButton title={name} withoutQuery />
          </>
        )}
      </div>

      {mine && (
        <nav aria-label={tp('shortcuts.label')} className="w-full">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {(
              [
                ['/bookings', 'deals'],
                ['/wallet', 'wallet'],
                ['/messages', 'messages'],
                ['/notifications', 'notifications'],
              ] as const
            ).map(([href, key]) => (
              <li key={key}>
                <Link
                  href={href}
                  className={`rounded-pill ease-yoyo inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-bold transition-[transform,background-color] duration-150 hover:-translate-y-0.5 ${
                    night ? 'border-[var(--paper)]/30 hover:bg-[var(--paper)]/10' : 'border-ink/20 hover:bg-mist'
                  }`}
                >
                  {tp(`shortcuts.${key}`)}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <Dialog
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === 'find' ? tp('findPeople') : open === 'followers' ? tp('followersOf', { name }) : tp('followingOf', { name })}
      >
        {open === 'find' ? (
          <FindPeople />
        ) : people.isPending ? (
          <p className="text-ink/70">{tp('loading')}</p>
        ) : (people.data ?? []).length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-ink/70">{open === 'followers' ? tp('noFollowers', { name }) : tp('noFollowing', { name })}</p>
            {mine && open === 'following' && (
              <Button variant="ghost" onClick={() => setOpen('find')}>
                {tp('findPeople')}
              </Button>
            )}
          </div>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            {(people.data ?? []).map((person) => (
              <li key={person.id} onClick={() => setOpen(null)}>
                <PersonCard person={person} />
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
