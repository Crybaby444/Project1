'use client';

import { STICKER_COLORS, type AdminListing, type CategoryNode } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { ListingStatusBadge } from '@/components/listings/ListingStatusBadge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { findPath, localized } from '@/lib/listings/categories';
import { formatEuros } from '@/lib/listings/money';

function Row({ term, children, wide = false }: { term: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-[13px] font-bold tracking-[0.03em] uppercase">{term}</dt>
      <dd className="[overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/**
 * A listing as moderation reviews it: photos, texts, category and details, price, rules, city and
 * district, owner. The exact point is part of the data but deliberately not shown: it is not needed
 * for the decision and stays the owner's.
 */
export function ModerationCard({
  listing,
  categories,
  onApprove,
  onReject,
  busy,
}: {
  listing: AdminListing;
  categories: CategoryNode[];
  onApprove(): void;
  onReject(): void;
  busy: boolean;
}) {
  const t = useTranslations('moderation');
  const tCondition = useTranslations('listingCondition');
  const tRule = useTranslations('listingRules');
  const locale = useLocale();
  const [viewing, setViewing] = useState<number | null>(null);
  const path = findPath(categories, listing.categoryId);
  const leaf = path.at(-1);
  const total = listing.photos.length;
  const date = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(iso))
      : '';
  const value = (key: string, raw: string | number | boolean) => {
    const def = leaf?.attributes.find((attribute) => attribute.key === key);
    if (typeof raw === 'boolean') return raw ? t('yes') : t('no');
    const option = def?.options?.find((choice) => choice.value === raw);
    if (option) return localized(option.labels, locale);
    return def?.unit ? `${raw} ${def.unit}` : String(raw);
  };

  return (
    <article className="border-ink bg-surface rounded-card-xl flex flex-col gap-6 border p-5 sm:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl leading-tight font-bold [overflow-wrap:anywhere]">{listing.title}</h2>
          <p className="text-sm">{t('waiting', { date: date(listing.submittedAt) })}</p>
        </div>
        <ListingStatusBadge status={listing.status} className="self-start" />
      </header>

      {total > 0 && (
        <section aria-label={t('photos')}>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {listing.photos.map((photo, index) => (
              <li key={photo.id}>
                <button
                  type="button"
                  aria-label={t('openPhoto', { number: index + 1, total })}
                  onClick={() => setViewing(index)}
                  className="border-ink rounded-media ease-yoyo block aspect-[4/3] w-full overflow-hidden border transition-transform duration-250 hover:-translate-y-0.5 hover:-rotate-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage */}
                  <img src={photo.urls.thumb} alt="" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dl className="grid gap-5 sm:grid-cols-2">
        <Row term={t('category')}>
          {path.length > 0 ? (
            <span
              style={leaf ? { backgroundColor: STICKER_COLORS[leaf.sticker], color: '#000' } : undefined}
              className="rounded-pill inline-block border border-black px-2.5 py-0.5 text-sm font-bold"
            >
              {path.map((node) => localized(node.names, locale)).join(' · ')}
            </span>
          ) : (
            t('none')
          )}
        </Row>
        <Row term={t('condition')}>{listing.condition ? tCondition(listing.condition) : t('none')}</Row>
        <Row term={t('description')} wide>
          <span className="whitespace-pre-line">{listing.description}</span>
        </Row>
        {Object.keys(listing.attributes).length > 0 && (
          <Row term={t('details')} wide>
            <dl className="mt-1 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {Object.entries(listing.attributes).map(([key, raw]) => {
                const def = leaf?.attributes.find((attribute) => attribute.key === key);
                return (
                  <div key={key} className="flex flex-col">
                    <dt className="text-sm">{def ? localized(def.labels, locale) : key}</dt>
                    <dd className="font-bold">{value(key, raw)}</dd>
                  </div>
                );
              })}
            </dl>
          </Row>
        )}
        <Row term={t('price')}>
          <span className="flex flex-col">
            <span className="font-bold">
              {listing.dailyCents !== null && t('perDay', { price: formatEuros(listing.dailyCents, locale) })}
            </span>
            {listing.weeklyDiscountPercent > 0 && (
              <span>{t('weekly', { percent: listing.weeklyDiscountPercent })}</span>
            )}
            <span>{t('deposit', { amount: formatEuros(listing.depositCents, locale) })}</span>
            <span>{t('days', { min: listing.minDays, max: listing.maxDays })}</span>
          </span>
        </Row>
        <Row term={t('place')}>
          {[listing.city, listing.district].filter(Boolean).join(', ') || t('none')}
        </Row>
        <Row term={t('rules')}>
          {listing.rules.preset.length + listing.rules.custom.length === 0 ? (
            t('noRules')
          ) : (
            <ul className="list-inside list-disc">
              {listing.rules.preset.map((rule) => (
                <li key={rule}>{tRule(rule)}</li>
              ))}
              {listing.rules.custom.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          )}
        </Row>
        <Row term={t('owner')}>
          <span className="flex flex-col">
            <span className="font-bold">{listing.owner.name}</span>
            <span>{listing.owner.email}</span>
          </span>
        </Row>
      </dl>

      <div className="border-ink/20 flex flex-wrap gap-3 border-t pt-5">
        <Button onClick={onApprove} disabled={busy}>
          {t('approve')}
        </Button>
        <Button variant="ghost" onClick={onReject} disabled={busy}>
          {t('reject')}
        </Button>
      </div>

      <Dialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={t('photo', { number: (viewing ?? 0) + 1, total })}
        wide
      >
        {viewing !== null && (
          <div className="flex flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage */}
            <img
              src={listing.photos[viewing]!.urls.full}
              alt={t('photo', { number: viewing + 1, total })}
              className="border-ink rounded-media max-h-[70dvh] w-full border object-contain"
            />
            <Button variant="ghost" className="self-end" onClick={() => setViewing(null)}>
              {t('close')}
            </Button>
          </div>
        )}
      </Dialog>
    </article>
  );
}
