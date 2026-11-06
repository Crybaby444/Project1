'use client';

import { cleanText } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';

const MIN = 10;
const MAX = 500;
const SUGGESTIONS = ['photos', 'category', 'forbidden', 'contact'] as const;

/** The reason for a rejection (10–500 characters, as the API wants), with common reasons to add. */
export function RejectDialog({
  open,
  onClose,
  onReject,
  busy,
}: {
  open: boolean;
  onClose(): void;
  onReject(reason: string): void;
  busy: boolean;
}) {
  const t = useTranslations('moderation');
  const tCheck = useTranslations('builder.check');
  const counterId = useId();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const length = cleanText(reason).length;
  const error = !tried
    ? undefined
    : length < MIN
      ? tCheck('tooShort', { min: MIN })
      : length > MAX
        ? tCheck('tooLong', { max: MAX })
        : undefined;

  function send() {
    setTried(true);
    if (length >= MIN && length <= MAX) onReject(cleanText(reason));
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('rejectTitle')}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Field label={t('reason')} hint={t('reasonHint')} error={error}>
            <textarea
              rows={5}
              value={reason}
              maxLength={MAX}
              aria-describedby={counterId}
              onChange={(event) => setReason(event.target.value)}
              className={TEXTAREA_CLASS}
            />
          </Field>
          <p id={counterId} className="self-end text-sm tabular-nums">
            {length} / {MAX}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold tracking-[0.03em] uppercase">{t('suggestions')}</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((key, index) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setReason((text) => [text.trim(), t(`suggestion.${key}`)].filter(Boolean).join(' '))
                }
                className={`border-ink bg-surface rounded-pill ease-yoyo min-h-10 border px-3 text-left text-sm font-bold transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96] ${
                  index % 2 ? 'hover:rotate-1' : 'hover:-rotate-1'
                }`}
              >
                {t(`suggestion.${key}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button onClick={send} loading={busy}>
            {t('send')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
