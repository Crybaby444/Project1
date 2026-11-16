'use client';

import type { AdminIdentityQueue } from '@yoyo/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useDecideIdentity, useIdentityPhoto, useIdentityQueue } from '@/lib/identity/queries';
import { AdminPageHeader } from './parts';

type Item = AdminIdentityQueue['items'][number];

function Photo({ id, which, alt }: { id: string; which: 'document' | 'selfie'; alt: string }) {
  const photo = useIdentityPhoto(id, which);
  if (!photo.data) return <div aria-busy={photo.isPending || undefined} className="bg-mist rounded-media aspect-[4/3]" />;
  // eslint-disable-next-line @next/next/no-img-element -- a private object URL, never cached
  return <img src={photo.data} alt={alt} className="rounded-media aspect-[4/3] w-full bg-black object-contain" />;
}

function Check({ item }: { item: Item }) {
  const t = useTranslations('admin.identityCheck');
  const td = useTranslations('identityCheck.documents');
  const format = useFormatter();
  const decide = useDecideIdentity();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const act = (decision: 'approve' | 'reject') =>
    decide.mutate(
      { id: item.id, decision: decision === 'approve' ? { decision } : { decision, reason: reason.trim() } },
      { onSuccess: () => toast.show(decision === 'approve' ? t('approved') : t('rejected')), onError: () => toast.show(t('failed')) },
    );

  return (
    <li className="border-ink/15 rounded-media flex flex-col gap-4 border p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold">{item.user.name}</h2>
        <p className="text-ink/70 text-[14px]">
          {item.user.email}
          {item.user.birthDate && ` · ${t('born', { date: format.dateTime(new Date(item.user.birthDate), { dateStyle: 'medium' }) })}`}
          {` · ${td(item.documentType)} · ${format.relativeTime(new Date(item.submittedAt))}`}
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Photo id={item.id} which="document" alt={t('document', { name: item.user.name })} />
        <Photo id={item.id} which="selfie" alt={t('selfie', { name: item.user.name })} />
      </div>
      <p className="text-ink/70 text-[14px] leading-relaxed">{t('compare')}</p>
      {rejecting ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[14px] font-bold">
            {t('reason')}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} className={TEXTAREA_CLASS} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => act('reject')} disabled={!reason.trim()} loading={decide.isPending}>
              {t('reject')}
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => act('approve')} loading={decide.isPending}>
            {t('approve')}
          </Button>
          <Button variant="ghost" onClick={() => setRejecting(true)}>
            {t('reject')}
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * Identity checks waiting for a moderator, oldest first (owner, 2026-11-16). Every look at a photo is
 * logged; the photos are erased the moment a decision is made.
 */
export function AdminIdentity() {
  const t = useTranslations('admin');
  const queue = useIdentityQueue();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t('nav.identity')} note={queue.data ? t('common.total', { count: queue.data.items.length }) : undefined} />
      <p className="max-w-[60ch] leading-relaxed">{t('identityCheck.intro')}</p>
      {queue.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-64" />
      ) : queue.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void queue.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : queue.data.items.length === 0 ? (
        <p className="border-ink/15 rounded-media border px-5 py-10 text-center">{t('identityCheck.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {queue.data.items.map((item) => (
            <Check key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
