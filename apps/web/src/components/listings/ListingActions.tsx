'use client';

import type { ListingStatus } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';

export type ListingAction = 'hide' | 'unhide' | 'delete';

type ActionTarget = { status: ListingStatus; publishedAt: string | null };

/** What the owner may do with a listing in this status (the API's transition table). */
export function actionsFor({ status }: ActionTarget): ListingAction[] {
  if (status === 'ARCHIVED') return [];
  if (status === 'PUBLISHED') return ['hide', 'delete'];
  if (status === 'HIDDEN') return ['unhide', 'delete'];
  return ['delete'];
}

/** A listing that was never published is deleted with its photos; one that was is archived. */
export const deletesForGood = ({ publishedAt }: ActionTarget) => publishedAt === null;

/**
 * Hide, show again and delete as buttons (delete asks first, saying whether the listing goes for
 * good or into the archive). `perform` runs the request; the outcome is a toast.
 */
export function ListingActions({
  listing,
  perform,
  only,
}: {
  listing: ActionTarget;
  perform(action: ListingAction): Promise<void>;
  /** Limit to some of the actions (e.g. no delete where another control offers it). */
  only?: ListingAction[];
}) {
  const t = useTranslations('listingActions');
  const toast = useToast();
  const errorText = useErrorText();
  const [busy, setBusy] = useState<ListingAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const actions = actionsFor(listing).filter((action) => !only || only.includes(action));
  const forGood = deletesForGood(listing);

  async function run(action: ListingAction) {
    setBusy(action);
    try {
      await perform(action);
      toast.show(
        action === 'hide'
          ? t('hidden')
          : action === 'unhide'
            ? t('shown')
            : forGood
              ? t('deleted')
              : t('archived'),
      );
    } catch (error) {
      toast.show(errorText(error));
    } finally {
      setBusy(null);
    }
  }

  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action}
          variant="ghost"
          loading={busy === action}
          disabled={busy !== null}
          onClick={() => (action === 'delete' ? setConfirming(true) : void run(action))}
        >
          {t(action)}
        </Button>
      ))}
      <Dialog open={confirming} onClose={() => setConfirming(false)} title={t('deleteTitle')}>
        <p className="mb-6">{forGood ? t('deleteDraft') : t('deleteLive')}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => {
              setConfirming(false);
              void run('delete');
            }}
          >
            {t('deleteConfirm')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
