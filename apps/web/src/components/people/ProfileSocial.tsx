'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MessageOwnerButton } from '@/components/chat/MessageOwnerButton';
import { FollowButton } from './FollowButton';

/** The profile's social row: followers, following, reviews, and the Follow button (the count follows the press). */
export function ProfileSocial({ userId, name, followers, following, reviews }: { userId: string; name: string; followers: number; following: number; reviews: number }) {
  const t = useTranslations('people');
  const [delta, setDelta] = useState(0);
  const stat = (value: number, label: string) => (
    <div className="flex flex-col">
      <dt className="text-ink/70 order-2 text-[13px] font-semibold">{label}</dt>
      <dd className="font-display order-1 text-[2.2rem] leading-none font-black tabular-nums">{value}</dd>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4" data-profile-social="">
      <dl className="flex gap-8">
        {stat(followers + delta, t('followers', { count: followers + delta }))}
        {stat(following, t('followingCount'))}
        {stat(reviews, t('reviews', { count: reviews }))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <FollowButton userId={userId} name={name} onChange={(on) => setDelta((d) => d + (on ? 1 : -1))} />
        <MessageOwnerButton ownerId={userId} label={t('write')} size="md" />
      </div>
    </div>
  );
}
