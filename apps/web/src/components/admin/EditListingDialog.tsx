'use client';

import type { AdminListing, ListingCondition } from '@yoyo/shared';
import { LISTING_CONDITIONS, LISTING_LIMITS } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS, TEXTAREA_CLASS } from '@/components/ui/inputs';
import { Select } from '@/components/ui/Select';

export type ListingFixes = {
  title?: string;
  description?: string;
  condition?: ListingCondition;
  dailyCents?: number;
  depositCents?: number;
  weeklyDiscountPercent?: number;
};

const euros = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace(/\.00$/, '');
const toCents = (text: string) =>
  text.trim() === '' ? undefined : Math.round(Number(text.replace(',', '.')) * 100);

/**
 * An administrator fixes a listing (owner, 2026-11-16: manage everything on the site): its words, condition
 * and prices. Only what changed is sent; the owner is told, and the change goes to the audit log.
 */
export function EditListingDialog({
  listing,
  busy,
  onClose,
  onSave,
}: {
  listing: AdminListing;
  busy: boolean;
  onClose(): void;
  onSave(fixes: ListingFixes): void;
}) {
  const t = useTranslations('moderation.edit');
  const tc = useTranslations('listingCondition');
  const [title, setTitle] = useState(listing.title ?? '');
  const [description, setDescription] = useState(listing.description ?? '');
  const [condition, setCondition] = useState<ListingCondition | ''>(listing.condition ?? '');
  const [daily, setDaily] = useState(euros(listing.dailyCents));
  const [deposit, setDeposit] = useState(euros(listing.depositCents));
  const [discount, setDiscount] = useState(String(listing.weeklyDiscountPercent));
  const [problem, setProblem] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const fixes: ListingFixes = {};
    if (title.trim() !== (listing.title ?? '')) fixes.title = title.trim();
    if (description.trim() !== (listing.description ?? '').trim()) fixes.description = description.trim();
    if (condition && condition !== listing.condition) fixes.condition = condition;
    const d = toCents(daily);
    if (d !== undefined && d !== listing.dailyCents) fixes.dailyCents = d;
    const dep = toCents(deposit);
    if (dep !== undefined && dep !== listing.depositCents) fixes.depositCents = dep;
    const w = Number(discount);
    if (discount.trim() !== '' && w !== listing.weeklyDiscountPercent) fixes.weeklyDiscountPercent = w;
    if (
      fixes.title !== undefined &&
      (fixes.title.length < LISTING_LIMITS.title.min || fixes.title.length > LISTING_LIMITS.title.max)
    )
      return setProblem(t('titleLength'));
    if (fixes.description !== undefined && fixes.description.length < LISTING_LIMITS.description.min)
      return setProblem(t('descriptionLength'));
    if ([fixes.dailyCents, fixes.depositCents].some((v) => v !== undefined && (!Number.isFinite(v) || v < 0)))
      return setProblem(t('price'));
    if (Object.keys(fixes).length === 0) return setProblem(t('nothing'));
    setProblem(null);
    onSave(fixes);
  }

  return (
    <Dialog open onClose={onClose} title={t('title')}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t('fieldTitle')}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={LISTING_LIMITS.title.max}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label={t('fieldDescription')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={LISTING_LIMITS.description.max}
            className={TEXTAREA_CLASS}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('fieldCondition')}>
            <Select
              value={condition}
              onChange={(v) => setCondition(v as ListingCondition)}
              options={LISTING_CONDITIONS.map((c) => ({ value: c, label: tc(c) }))}
            />
          </Field>
          <Field label={t('fieldDaily')}>
            <input
              inputMode="decimal"
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label={t('fieldDeposit')}>
            <input
              inputMode="decimal"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label={t('fieldDiscount')}>
            <input
              inputMode="numeric"
              value={discount}
              onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ''))}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <p className="text-ink/70 text-sm">{t('note')}</p>
        {problem && (
          <p role="alert" className="text-sm font-bold text-[var(--danger)]">
            {problem}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t('save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
