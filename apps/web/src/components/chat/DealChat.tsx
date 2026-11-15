'use client';

import type { BookingView } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useConversations } from '@/lib/chat/queries';
import { DealChatLink } from './DealChatLink';
import { Thread } from './MessagesView';

/**
 * The conversation inside the deal's page (owner, 2026-11-16: messages and deals are one whole): write
 * to the other side while you look at the steps; deal steps appear in it as lines.
 */
export function DealChat({ booking }: { booking: BookingView }) {
  const t = useTranslations('chat');
  const conversations = useConversations();
  if (booking.viewerRole === 'ADMIN') return null;
  const otherId = booking.viewerRole === 'RENTER' ? booking.owner.id : booking.renter.id;
  const found = conversations.data?.find((c) => c.listing.id === booking.listing.id && c.other.id === otherId);

  return (
    <section aria-labelledby="deal-chat" className="border-ink/15 flex flex-col gap-3 border-t pt-6" data-deal-chat="">
      <h2 id="deal-chat" className="font-display text-[2rem] leading-[0.95] font-black uppercase">
        {t('inDealTitle')}
      </h2>
      {found ? (
        <div className="rounded-media border-ink/15 bg-surface flex h-[min(34rem,70svh)] flex-col overflow-hidden border">
          <Thread id={found.id} inDeal />
        </div>
      ) : (
        conversations.data && <DealChatLink listingId={booking.listing.id} otherId={otherId} role={booking.viewerRole} />
      )}
    </section>
  );
}
