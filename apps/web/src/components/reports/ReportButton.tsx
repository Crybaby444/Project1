'use client';

import { useMutation } from '@tanstack/react-query';
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/**
 * "Report this …" (spec §5): a quiet text button that opens a dialog with the reasons and a few words,
 * then thanks the person. A visitor signs in first. Repeating a report says it is already being looked at.
 */
export function ReportButton({ target, id, ownerId, className = '' }: { target: ReportTarget; id: string; /** Hidden for this person (their own item or profile). */ ownerId?: string; className?: string }) {
  const t = useTranslations('report');
  const client = useApiClient();
  const { status, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const noteId = useId();
  const send = useMutation({
    mutationFn: async () => {
      await unwrap(client.POST('/api/v1/reports', { body: { target, id, reason: reason!, note: note.trim() } }));
    },
  });
  const already = send.error instanceof ApiError && send.error.details?.['why'] === 'ALREADY_REPORTED';
  const label = t(target === 'LISTING' ? 'listing' : target === 'USER' ? 'user' : 'message');
  const ready = reason !== null && (reason !== 'OTHER' || note.trim().length >= 5);

  if (ownerId && user?.id === ownerId) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (status === 'authenticated' ? setOpen(true) : router.push(`/login?next=${encodeURIComponent(pathname)}`))}
        className={`text-ink/70 hover:text-ink inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold underline decoration-1 underline-offset-4 ${className}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
          <path d="M5 21V4m0 0h11l-2 4 2 4H5" />
        </svg>
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('title')}>
        {send.isSuccess || already ? (
          <div className="flex flex-col gap-5">
            <p role="status" className="text-lg leading-relaxed">
              {already ? t('already') : t('sent')}
            </p>
            <Button className="self-start" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) send.mutate();
            }}
          >
            <p className="leading-relaxed">{t('intro')}</p>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{t('title')}</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r} className={`rounded-media flex min-h-11 cursor-pointer items-center gap-3 border px-4 py-2.5 ${reason === r ? 'border-ink bg-ink/[0.04] font-semibold' : 'border-ink/20'}`}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4 accent-[var(--ink)]" />
                  {t(`reason.${r}`)}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col gap-2">
              <label htmlFor={noteId} className="text-sm font-semibold">
                {t('note')}
              </label>
              <textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} aria-describedby={`${noteId}-hint`} className={TEXTAREA_CLASS} />
              <span id={`${noteId}-hint`} className="text-ink/70 text-[13px]">
                {t('noteHint')}
              </span>
            </div>
            {send.isError && (
              <p role="alert" className="font-semibold">
                {t('failed')}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={!ready} loading={send.isPending}>
                {t('send')}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
