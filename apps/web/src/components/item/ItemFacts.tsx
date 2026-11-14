import type { AttributeDef, AttributeValue, Locale, PublicListing } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';

type Format = { yes: string; no: string; locale: string };

/** One attribute value as people read it: a choice by its label, yes/no, a number with its unit. */
export function attributeText(def: AttributeDef, value: AttributeValue, { yes, no, locale }: Format): string {
  if (def.type === 'BOOLEAN') return value === true ? yes : no;
  if (def.type === 'SELECT') {
    const option = def.options?.find((choice) => choice.value === value);
    return option ? option.labels[locale as Locale] : String(value);
  }
  if (def.type === 'NUMBER' && typeof value === 'number') {
    const number = new Intl.NumberFormat(locale).format(value);
    return def.unit ? `${number} ${def.unit}` : number;
  }
  return String(value);
}

/**
 * What the owner said about the item: condition and the category's characteristics (labels in the
 * page's language, free text in the item's), the rules, and the district. Values the category no
 * longer knows are left out.
 */
export function ItemFacts({ listing, attributes }: { listing: PublicListing; attributes: AttributeDef[] }) {
  const t = useTranslations('item.facts');
  const tCondition = useTranslations('listingCondition');
  const tRules = useTranslations('listingRules');
  const locale = useLocale();
  const format = { yes: t('yes'), no: t('no'), locale };
  const rows = attributes.flatMap((def) => {
    const value = listing.attributes[def.key];
    if (value === undefined || value === '') return [];
    return [{ key: def.key, label: def.labels[locale as Locale], text: attributeText(def, value, format), free: def.type === 'TEXT' }];
  });
  const place = [listing.city, listing.district].filter(Boolean).join(', ');
  const hasRules = listing.rules.preset.length + listing.rules.custom.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {(listing.condition || rows.length > 0) && (
        <section aria-labelledby="item-details" className="flex flex-col gap-3">
          <h2 id="item-details" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
            {t('details')}
          </h2>
          <dl className="border-ink/15 divide-ink/15 divide-y border-y">
            {listing.condition && (
              <div className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                <dt className="text-ink/75 font-bold">{t('condition')}</dt>
                <dd>{tCondition(listing.condition)}</dd>
              </div>
            )}
            {rows.map((row) => (
              <div key={row.key} className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                <dt className="text-ink/75 font-bold hyphens-auto [overflow-wrap:anywhere]">{row.label}</dt>
                <dd className="[overflow-wrap:anywhere]" lang={row.free ? listing.contentLocale : undefined}>
                  {row.text}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {hasRules && (
        <section aria-labelledby="item-rules" className="flex flex-col gap-3">
          <h2 id="item-rules" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
            {t('rules')}
          </h2>
          <ul className="flex flex-col gap-2">
            {listing.rules.preset.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span aria-hidden="true" className="bg-ink mt-2 size-1.5 shrink-0 rounded-full" />
                {tRules(rule)}
              </li>
            ))}
            {listing.rules.custom.map((rule, index) => (
              <li key={index} className="flex gap-2 [overflow-wrap:anywhere]" lang={listing.contentLocale}>
                <span aria-hidden="true" className="bg-ink mt-2 size-1.5 shrink-0 rounded-full" />
                {rule}
              </li>
            ))}
          </ul>
        </section>
      )}

      {place && (
        <section aria-labelledby="item-place" className="flex flex-col gap-2">
          <h2 id="item-place" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
            {t('place')}
          </h2>
          <p className="flex items-center gap-2 text-lg">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
              <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="12" cy="10" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
            </svg>
            <span className="[overflow-wrap:anywhere]">{place}</span>
          </p>
          <p className="text-sm">{t('placeNote')}</p>
        </section>
      )}
    </div>
  );
}
