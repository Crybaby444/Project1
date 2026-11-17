'use client';

import type { BookingView } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useDealConversation } from '@/lib/chat/queries';
import { Thread } from './MessagesView';

/**
 * The deal's own chat (owner, 2026-11-16: deals have their own chat; Messages are personal): write to the
 * other side next to the steps; deal steps appear in it as lines.
 */
export function DealChat({ booking }: { booking: BookingView }) {
  const t = useTranslations('chat');
  const conversation = useDealConversation(booking.id, booking.viewerRole !== 'ADMIN');
  if (booking.viewerRole === 'ADMIN') return null;
  return (
    <section aria-labelledby="deal-chat" className="border-ink/15 flex flex-col gap-3 border-t pt-6" data-deal-chat="">
      <h2 id="deal-chat" className="font-display text-4xl leading-[0.95] font-black uppercase">
        {t('inDealTitle')}
      </h2>
      <div className="rounded-media border-ink/15 bg-surface flex h-[min(34rem,70svh)] flex-col overflow-hidden border">
        {conversation.data ? <Thread id={conversation.data.id} inDeal /> : <div aria-busy="true" className="flex-1" />}
      </div>
    </section>
  );
}
