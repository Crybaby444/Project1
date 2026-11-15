'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useOpenDirect } from '@/lib/chat/queries';
import { useSession } from '@/lib/session/SessionProvider';

/**
 * "Write a message" to a person (an item's owner, or anyone from their profile): opens the personal
 * conversation with them in Messages (owner, 2026-11-16: Messages are personal; a deal has its own chat).
 * `about` is an item to mention: the message box starts with its link. A visitor signs in first.
 */
export function MessageOwnerButton({ ownerId, about, label, size = 'lg' }: { ownerId: string; about?: { id: string; title: string } | undefined; label?: string; size?: 'lg' | 'md' }) {
  const t = useTranslations('chat');
  const { status, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const open = useOpenDirect();
  const text = label ?? t('messageOwner');

  if (user?.id === ownerId) return null;
  if (status !== 'authenticated') {
    return (
      <Button variant="ghost" size={size} href={`/login?next=${encodeURIComponent(pathname)}`}>
        {text}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size={size}
        loading={open.isPending || open.isSuccess}
        onClick={() => open.mutate(ownerId, { onSuccess: (c) => router.push(about ? `/messages/${c.id}?about=${encodeURIComponent(about.id)}` : `/messages/${c.id}`) })}
      >
        {text}
      </Button>
      {open.isError && (
        <p role="alert" className="text-sm font-semibold">
          {t('sendFailed')}
        </p>
      )}
    </div>
  );
}
