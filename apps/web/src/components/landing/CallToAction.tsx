'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LIST_ITEM_HREF } from '@/lib/site';
import { useSession } from '@/lib/session/SessionProvider';

type CallToActionProps = {
  /** The quieter second button. */
  secondary: { href: string; label: string };
  className?: string;
};

/**
 * The page's one filled action plus a quieter one. A guest is offered an account; a signed-in person
 * is offered to list an item (once the listing builder is on the site). While the session is still
 * unknown the guest version shows, so the buttons never jump.
 */
export function CallToAction({ secondary, className = '' }: CallToActionProps) {
  const t = useTranslations('landing');
  const { status } = useSession();
  const signedIn = status === 'authenticated';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {!signedIn ? (
        <Button href="/register" size="lg">
          {t('ctaSignUp')}
        </Button>
      ) : LIST_ITEM_HREF ? (
        <Button href={LIST_ITEM_HREF} size="lg">
          {t('ctaListItem')}
        </Button>
      ) : null}
      <Button href={secondary.href} variant={signedIn && !LIST_ITEM_HREF ? 'primary' : 'ghost'} size="lg">
        {secondary.label}
      </Button>
    </div>
  );
}
