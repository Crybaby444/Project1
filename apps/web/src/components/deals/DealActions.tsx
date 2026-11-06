'use client';

import { BOOKING_LIMITS, type BookingAction, type BookingEventInput, type BookingView } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useDealAction } from '@/lib/deals/queries';
import { CheckoutDialog } from './CheckoutDialog';
import { DamagePhotos } from './DealPhotos';

/** The step each deal moves forward with: filled ink buttons (DESIGN.md: one per screen, here one per step). */
const FORWARD = new Set<BookingAction>([
  'ACCEPT',
  'SIGN',
  'PAY',
  'MARK_HANDED_OVER',
  'CONFIRM_RECEIVED',
  'MARK_RETURNED',
  'CONFIRM_RETURNED',
  'ALL_FINE',
  'ACCEPT_DAMAGE',
]);

/** Steps that need words: a reason or a note (optional only when declining). */
const NEEDS_TEXT = { DECLINE: 'optional', CANCEL: 'reason', REPORT_NOT_RECEIVED: 'note', REPORT_NOT_RETURNED: 'note', REJECT_DAMAGE: 'note' } as const;
type TextAction = keyof typeof NEEDS_TEXT;

/** Steps worth a second look before they are taken (they move money or cannot be undone). */
const CONFIRM = new Set<BookingAction>(['WITHDRAW', 'CONFIRM_RECEIVED', 'ALL_FINE', 'ACCEPT_DAMAGE', 'MARK_HANDED_OVER', 'MARK_RETURNED', 'CONFIRM_RETURNED']);

/** An action as the API takes it, from the button and what the dialog collected. */
export function eventFor(action: BookingAction, text: string, photoIds: string[] = []): BookingEventInput | null {
  const words = text.trim();
  switch (action) {
    case 'DECLINE':
      return words ? { type: 'DECLINE', reason: words } : { type: 'DECLINE' };
    case 'CANCEL':
      return { type: 'CANCEL', reason: words };
    case 'REPORT_NOT_RECEIVED':
    case 'REPORT_NOT_RETURNED':
    case 'REJECT_DAMAGE':
      return { type: action, note: words };
    case 'REPORT_DAMAGE':
      return { type: 'REPORT_DAMAGE', description: words, photoIds };
    case 'PAY':
    case 'RESOLVE':
      return null;
    default:
      return { type: action } as BookingEventInput;
  }
}

/**
 * One button for each step the core allows this side now (`booking.actions`, the domain's
 * availableActions): never a button the API would refuse. Forward steps are filled, the rest outlined.
 * Words are asked for in a dialog; money-moving or final steps are confirmed first; paying opens the
 * checkout. Every step is sent with the deal's version and an Idempotency-Key, and nothing changes on
 * screen before the API answers.
 */
export function DealActions({ booking, onError }: { booking: BookingView; onError(error: unknown): void }) {
  const t = useTranslations('dealActions');
  const td = useTranslations('deal');
  const toast = useToast();
  const action = useDealAction(booking);
  const [open, setOpen] = useState<BookingAction | null>(null);
  const [text, setText] = useState('');
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [running, setRunning] = useState<BookingAction | null>(null);
  const actions = booking.actions.filter((a) => a !== 'RESOLVE');

  async function take(kind: BookingAction) {
    const event = eventFor(kind, text, photoIds);
    if (!event) return;
    setRunning(kind);
    try {
      await action.run(event);
      setOpen(null);
      setText('');
      setPhotoIds([]);
      setTried(false);
      toast.show(td('done'));
    } catch (error) {
      setOpen(null);
      onError(error);
    } finally {
      setRunning(null);
    }
  }

  function press(kind: BookingAction) {
    if (kind === 'PAY' || kind in NEEDS_TEXT || kind === 'REPORT_DAMAGE' || CONFIRM.has(kind)) {
      setText('');
      setTried(false);
      setOpen(kind);
    } else void take(kind);
  }

  if (actions.length === 0) return null;

  const textKind = open && open in NEEDS_TEXT ? (open as TextAction) : null;
  const need = textKind ? NEEDS_TEXT[textKind] : null;
  const textMissing = (need !== null && need !== 'optional' && text.trim() === '') || (open === 'REPORT_DAMAGE' && text.trim().length < BOOKING_LIMITS.damageDescription.min);
  const photosMissing = open === 'REPORT_DAMAGE' && photoIds.length === 0;

  return (
    <div className="flex flex-col gap-3" data-deal-actions="">
      <div className="flex flex-wrap gap-3">
        {actions.map((kind) => (
          <Button
            key={kind}
            variant={FORWARD.has(kind) ? 'primary' : 'ghost'}
            size={FORWARD.has(kind) ? 'lg' : 'md'}
            onClick={() => press(kind)}
            loading={running === kind}
            disabled={running !== null && running !== kind}
            data-action={kind}
            className="max-w-full whitespace-normal text-center"
          >
            {t(kind)}
          </Button>
        ))}
      </div>

      {open === 'PAY' && <CheckoutDialog booking={booking} open onClose={() => setOpen(null)} />}

      {open && open !== 'PAY' && (
        <Dialog
          open
          onClose={() => running === null && setOpen(null)}
          title={textKind || open === 'REPORT_DAMAGE' ? t(`dialog.${open as TextAction}`) : t(open)}
          wide={open === 'REPORT_DAMAGE'}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setTried(true);
              if (textMissing || photosMissing) return;
              void take(open);
            }}
          >
            {textKind || open === 'REPORT_DAMAGE' ? (
              <p>{t(`lead.${open as TextAction}`)}</p>
            ) : (
              <p>{t(`confirm.${open as 'WITHDRAW'}`)}</p>
            )}
            {(textKind || open === 'REPORT_DAMAGE') && (
              <Field
                label={open === 'REPORT_DAMAGE' ? t('description') : need === 'optional' ? t('reasonOptional') : need === 'reason' ? t('reason') : t('note')}
                hint={open === 'REPORT_DAMAGE' ? t('descriptionHint', { min: BOOKING_LIMITS.damageDescription.min }) : undefined}
                error={tried && textMissing ? (open === 'REPORT_DAMAGE' ? t('descriptionHint', { min: BOOKING_LIMITS.damageDescription.min }) : t('required')) : undefined}
              >
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={BOOKING_LIMITS.text}
                  rows={4}
                  className={TEXTAREA_CLASS}
                />
              </Field>
            )}
            {open === 'REPORT_DAMAGE' && (
              <DamagePhotos bookingId={booking.id} value={photoIds} onChange={setPhotoIds} error={tried && photosMissing ? t('photosRequired') : undefined} />
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setOpen(null)} disabled={running !== null}>
                {t('keep')}
              </Button>
              <Button type="submit" loading={running === open} data-confirm={open}>
                {textKind || open === 'REPORT_DAMAGE' ? t('submit') : t('confirmYes')}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
