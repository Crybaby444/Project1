'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useOpenConversation } from '@/lib/chat/queries';
import { useSession } from '@/lib/session/SessionProvider';

/**
 * "Message the owner" on an item page: opens (or finds) my conversation about the item and goes to it.
 * A visitor signs in first and comes back here; the owner does not see it on their own item.
 */
export function MessageOwnerButton({ listingId, ownerId }: { listingId: string; ownerId: string }) {
  const t = useTranslations('chat');
  const { status, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const open = useOpenConversation();

  if (user?.id === ownerId) return null;
  if (status !== 'authenticated') {
    return (
      <Button variant="ghost" size="lg" href={`/login?next=${encodeURIComponent(pathname)}`}>
        {t('messageOwner')}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size="lg"
        loading={open.isPending || open.isSuccess}
        onClick={() => open.mutate(listingId, { onSuccess: (c) => router.push(`/messages/${c.id}`) })}
      >
        {t('messageOwner')}
      </Button>
      {open.isError && (
        <p role="alert" className="text-sm font-semibold">
          {t('sendFailed')}
        </p>
      )}
    </div>
  );
}
