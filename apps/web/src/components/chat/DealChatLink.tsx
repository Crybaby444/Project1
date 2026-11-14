'use client';

import type { ChatRole } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { useConversations, useOpenConversation } from '@/lib/chat/queries';

/**
 * The way from a deal to its conversation (the item and the two sides). The renter can start one if it
 * is missing (deals made before the chat existed); the owner sees the link once the renter's side has
 * one, which every deal since then does.
 */
export function DealChatLink({ listingId, otherId, role }: { listingId: string; otherId: string; role: ChatRole }) {
  const t = useTranslations('chat');
  const router = useRouter();
  const conversations = useConversations();
  const open = useOpenConversation();
  const label = role === 'RENTER' ? t('messageOwner') : t('messageRenter');

  if (!conversations.data) return null;
  const found = conversations.data.find((c) => c.listing.id === listingId && c.other.id === otherId);
  if (found) {
    return (
      <Button href={`/messages/${found.id}`} variant="ghost">
        {label}
      </Button>
    );
  }
  if (role !== 'RENTER') return null;
  return (
    <Button
      variant="ghost"
      loading={open.isPending || open.isSuccess}
      onClick={() => open.mutate(listingId, { onSuccess: (c) => router.push(`/messages/${c.id}`) })}
    >
      {label}
    </Button>
  );
}
