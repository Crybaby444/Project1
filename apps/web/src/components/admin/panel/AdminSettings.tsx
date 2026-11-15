'use client';

import type { AdminSettings as Settings } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useAdminSettings, useSaveAdminSettings } from '@/lib/admin/queries';
import { ApiError } from '@/lib/session/api-error';
import { AdminPageHeader, Panel } from './parts';

const GROUPS: { key: 'fees' | 'deals' | 'other'; keys: string[] }[] = [
  { key: 'fees', keys: ['fees.servicePercent', 'fees.promoServicePercent', 'fees.promoServiceUntil'] },
  {
    key: 'deals',
    keys: ['booking.requestTtlHours', 'booking.paymentTtlHours', 'booking.handoverConfirmHours', 'booking.returnConfirmHours', 'booking.inspectionHours', 'booking.damageReplyHours'],
  },
  { key: 'other', keys: ['booking.maxAdvanceDays', 'review.windowDays'] },
];

/**
 * Platform settings: every deal rule and the fee, grouped, each with its default and a mark when changed.
 * Edits collect until "Save changes" (one change, one audit entry); the API checks them against the deal
 * rules and says what does not fit.
 */
export function AdminSettings() {
  const t = useTranslations('admin');
  const settings = useAdminSettings();
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <AdminPageHeader title={t('settings.title')} note={t('settings.intro')} />
      {settings.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-96" />
      ) : settings.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void settings.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <Form data={settings.data} />
      )}
    </div>
  );
}

function Form({ data }: { data: Settings }) {
  const t = useTranslations('admin.settings');
  const toast = useToast();
  const save = useSaveAdminSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const byKey = new Map(data.items.map((i) => [i.key, i]));
  const dirty = Object.keys(draft).filter((k) => String(byKey.get(k)?.value ?? '') !== draft[k]);

  function submit() {
    const change: Record<string, number | string> = {};
    for (const key of dirty) {
      const item = byKey.get(key)!;
      change[key] = typeof item.default === 'number' ? Number(draft[key]) : draft[key]!.trim();
    }
    save.mutate(change, {
      onSuccess: () => {
        setDraft({});
        toast.show(t('saved'));
      },
      onError: (error) => toast.show(t('failed', { reason: error instanceof ApiError ? error.message : String(error) })),
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty.length > 0) submit();
      }}
      className="flex flex-col gap-5"
    >
      {GROUPS.map((group) => (
        <Panel key={group.key} title={t(`group.${group.key}`)}>
          <div className="flex flex-col divide-y divide-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
            {group.keys.map((key) => {
              const item = byKey.get(key);
              if (!item) return null;
              const value = draft[key] ?? String(item.value);
              const isNumber = typeof item.default === 'number';
              const id = `setting-${key}`;
              return (
                <div key={key} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:gap-6">
                  <div className="min-w-0">
                    <label htmlFor={id} className="font-semibold">
                      {t(`key.${key}`)}
                    </label>
                    <p className="text-ink/70 text-[13px]">
                      {t('default', { value: String(item.default) || '—' })}
                      {item.changed && <span className="bg-ink text-canvas rounded-pill ml-2 px-2 py-0.5 text-[11px] font-bold">{t('changed')}</span>}
                      {t.has(`hint.${key}`) && <span className="block">{t(`hint.${key}`)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id={id}
                      type={isNumber ? 'number' : 'date'}
                      inputMode={isNumber ? 'numeric' : undefined}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      className={`${INPUT_CLASS} tabular-nums`}
                    />
                    {String(item.value) !== String(item.default) && draft[key] === undefined && (
                      <button
                        type="button"
                        title={t('reset')}
                        aria-label={`${t('reset')}: ${t(`key.${key}`)}`}
                        onClick={() => setDraft((d) => ({ ...d, [key]: String(item.default) }))}
                        className="border-ink/30 hover:border-ink rounded-pill inline-grid size-10 shrink-0 place-items-center border"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                          <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
      <div className="bg-canvas/95 border-ink/15 sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t px-1 py-4 backdrop-blur">
        <p className="text-sm font-semibold">{dirty.length > 0 ? t('unsaved') : ''}</p>
        <Button type="submit" disabled={dirty.length === 0} loading={save.isPending}>
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
