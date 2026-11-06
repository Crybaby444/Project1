import { PRICING_LIMITS } from '@yoyo/domain';
import {
  LISTING_LIMITS,
  LISTING_STEPS,
  cleanText,
  stepOfField,
  validateAttributes,
  type AttributeValue,
  type CategoryNode,
  type ListingCondition,
  type ListingStep,
  type OwnerListing,
  type Locale,
  type RulePreset,
} from '@yoyo/shared';
import { isLeaf } from './categories';

/** The builder's steps (spec §4.3): the API's five, plus rules and publishing. */
export const BUILDER_STEPS = [...LISTING_STEPS, 'rules'] as const;

export type BuilderStep = (typeof BUILDER_STEPS)[number];

/** What the builder edits, as the API stores it (amounts in cents; NaN marks an amount that is not one). */
export type ListingValues = {
  categoryId: string | null;
  title: string;
  description: string;
  condition: ListingCondition | null;
  attributes: Record<string, AttributeValue>;
  dailyCents: number | null;
  weeklyDiscountPercent: number;
  depositCents: number;
  minDays: number;
  maxDays: number;
  city: string;
  district: string;
  lat: number | null;
  lng: number | null;
  rules: { preset: RulePreset[]; custom: string[] };
  /** The language the texts are written in (the item page's canonical address and <html lang>). */
  contentLocale: Locale;
};

/** A field error as a message key of `builder.check` and its values. */
export type Check = { key: CheckKey; params?: Record<string, number> };

export type CheckKey =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'number'
  | 'priceRange'
  | 'discountRange'
  | 'depositRange'
  | 'daysRange'
  | 'maxBelowMin'
  | 'chooseSubcategory'
  | 'attribute'
  | 'photos'
  | 'point';

/** A new draft: its texts are taken to be in the language of the page it is written on. */
export function emptyValues(contentLocale: Locale = 'en'): ListingValues {
  return {
    categoryId: null,
    title: '',
    description: '',
    condition: null,
    attributes: {},
    dailyCents: null,
    weeklyDiscountPercent: 0,
    depositCents: 0,
    minDays: 1,
    maxDays: 30,
    city: '',
    district: '',
    lat: null,
    lng: null,
    rules: { preset: [], custom: [] },
    contentLocale,
  };
}

export function valuesFromListing(listing: OwnerListing): ListingValues {
  return {
    categoryId: listing.categoryId,
    title: listing.title ?? '',
    description: listing.description ?? '',
    condition: listing.condition,
    attributes: listing.attributes,
    dailyCents: listing.dailyCents,
    weeklyDiscountPercent: listing.weeklyDiscountPercent,
    depositCents: listing.depositCents,
    minDays: listing.minDays,
    maxDays: listing.maxDays,
    city: listing.city ?? '',
    district: listing.district ?? '',
    lat: listing.lat,
    lng: listing.lng,
    rules: { preset: [...listing.rules.preset], custom: [...listing.rules.custom] },
    contentLocale: listing.contentLocale,
  };
}

type Mode = 'draft' | 'submit';

function text(value: string, { min, max }: { min: number; max: number }, mode: Mode): Check | undefined {
  const length = cleanText(value).length;
  if (length > max) return { key: 'tooLong', params: { max } };
  if (mode === 'draft') return undefined;
  if (length === 0) return { key: 'required' };
  if (length < min) return { key: 'tooShort', params: { min } };
  return undefined;
}

const outside = (value: number, min: number, max: number) =>
  !Number.isInteger(value) || value < min || value > max;

/**
 * What the API would refuse, field by field (keys as in its `fields`: `title`, `attributes.model`,
 * `rules.custom.0`…). `draft` checks only what a draft may not hold (too long, out of range);
 * `submit` also wants everything a listing needs before review (LISTING_INCOMPLETE).
 */
export function checkListing(
  values: ListingValues,
  mode: Mode,
  { category, photoCount }: { category?: CategoryNode | undefined; photoCount: number },
): Record<string, Check> {
  const errors: Record<string, Check> = {};
  const put = (field: string, check: Check | undefined) => {
    if (check) errors[field] = check;
  };
  const submit = mode === 'submit';

  put('title', text(values.title, LISTING_LIMITS.title, mode));
  put('description', text(values.description, LISTING_LIMITS.description, mode));
  if (submit && values.condition === null) put('condition', { key: 'required' });

  if (values.categoryId === null) {
    if (submit) put('categoryId', { key: 'required' });
  } else if (category) {
    if (!isLeaf(category)) {
      if (submit) put('categoryId', { key: 'chooseSubcategory' });
    } else {
      const checked = validateAttributes(values.attributes, category.attributes, mode);
      if (!checked.ok) {
        for (const field of Object.keys(checked.fields)) {
          const key = field.slice('attributes.'.length);
          const missing = values.attributes[key] === undefined || values.attributes[key] === '';
          put(field, { key: missing ? 'required' : 'attribute' });
        }
      }
    }
  }

  const { dailyCents, weeklyDiscountPercent, depositCents, days } = PRICING_LIMITS;
  if (values.dailyCents === null) {
    if (submit) put('dailyCents', { key: 'required' });
  } else if (Number.isNaN(values.dailyCents)) put('dailyCents', { key: 'number' });
  else if (outside(values.dailyCents, dailyCents.min, dailyCents.max))
    put('dailyCents', {
      key: 'priceRange',
      params: { min: dailyCents.min / 100, max: dailyCents.max / 100 },
    });

  if (Number.isNaN(values.weeklyDiscountPercent)) put('weeklyDiscountPercent', { key: 'number' });
  else if (outside(values.weeklyDiscountPercent, weeklyDiscountPercent.min, weeklyDiscountPercent.max))
    put('weeklyDiscountPercent', { key: 'discountRange', params: { max: weeklyDiscountPercent.max } });

  if (Number.isNaN(values.depositCents)) put('depositCents', { key: 'number' });
  else if (outside(values.depositCents, depositCents.min, depositCents.max))
    put('depositCents', { key: 'depositRange', params: { max: depositCents.max / 100 } });

  const minOk = !outside(values.minDays, days.min, days.max);
  if (Number.isNaN(values.minDays)) put('minDays', { key: 'number' });
  else if (!minOk) put('minDays', { key: 'daysRange', params: { min: days.min, max: days.max } });
  if (Number.isNaN(values.maxDays)) put('maxDays', { key: 'number' });
  else if (outside(values.maxDays, days.min, days.max))
    put('maxDays', { key: 'daysRange', params: { min: days.min, max: days.max } });
  else if (minOk && values.maxDays < values.minDays) put('maxDays', { key: 'maxBelowMin' });

  const place = { min: 1, max: LISTING_LIMITS.place };
  put('city', text(values.city, place, mode));
  put('district', text(values.district, place, mode));
  if (submit && (values.lat === null || values.lng === null)) put('lat', { key: 'point' });

  values.rules.custom.forEach((rule, index) => {
    const length = cleanText(rule).length;
    const { min, max } = LISTING_LIMITS.customRule;
    if (length > max) put(`rules.custom.${index}`, { key: 'tooLong', params: { max } });
    else if (length < min) put(`rules.custom.${index}`, { key: 'tooShort', params: { min } });
  });

  if (submit && photoCount < 1) put('photos', { key: 'photos' });
  return errors;
}

/** The builder step a field belongs to. */
export function stepOf(field: string): BuilderStep {
  if (field === 'rules' || field.startsWith('rules.')) return 'rules';
  return stepOfField(field) satisfies ListingStep;
}

export function isBuilderStep(value: string | null | undefined): value is BuilderStep {
  return (BUILDER_STEPS as readonly string[]).includes(value ?? '');
}
