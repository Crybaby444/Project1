import { DomainError, PRICING_LIMITS, validatePricing, type ListingPricing } from '@yoyo/domain';
import { LISTING_LIMITS, ListingSubmitSchema, stepOfField, validateAttributes, type ListingStep } from '@yoyo/shared';
import type { CategoryForListing } from '../categories/categories.service';
import { AppError } from '../common/app-error';
import type { Listing } from '../generated/prisma/client';

/** A coordinate as stored (Decimal) or as just changed (number). */
const toNumber = (value: { toNumber(): number } | number | null) => (value === null ? null : typeof value === 'number' ? value : value.toNumber());

const euros = (cents: number) => (cents / 100).toFixed(2);

const PRICE_MESSAGES: Record<keyof ListingPricing, string> = {
  dailyCents: `From ${euros(PRICING_LIMITS.dailyCents.min)} to ${euros(PRICING_LIMITS.dailyCents.max)} € a day`,
  weeklyDiscountPercent: `From ${PRICING_LIMITS.weeklyDiscountPercent.min} to ${PRICING_LIMITS.weeklyDiscountPercent.max} %`,
  depositCents: `From ${euros(PRICING_LIMITS.depositCents.min)} to ${euros(PRICING_LIMITS.depositCents.max)} €`,
  minDays: `From ${PRICING_LIMITS.days.min} to ${PRICING_LIMITS.days.max} days`,
  maxDays: `At least the minimum and at most ${PRICING_LIMITS.days.max} days`,
};

/**
 * What keeps a listing from going to review, field by field (empty when nothing):
 * ListingSubmitSchema (texts, condition, place, point, price present), a leaf category with every
 * required attribute, the price rules of @yoyo/domain (`validatePricing`) and 1–8 photos.
 */
export function incompleteFields(listing: Listing, photoCount: number, category: CategoryForListing | null): Record<string, string> {
  const fields: Record<string, string> = {};
  const parsed = ListingSubmitSchema.safeParse({
    title: listing.title,
    description: listing.description,
    condition: listing.condition,
    categoryId: listing.categoryId,
    dailyCents: listing.dailyCents,
    city: listing.city,
    district: listing.district,
    lat: toNumber(listing.lat),
    lng: toNumber(listing.lng),
  });
  for (const issue of parsed.error?.issues ?? []) {
    const key = issue.path.map(String).join('.');
    if (!(key in fields)) fields[key] = issue.message;
  }
  if (photoCount < 1) fields['photos'] = 'Add at least one photo';
  else if (photoCount > LISTING_LIMITS.photos) fields['photos'] = `At most ${LISTING_LIMITS.photos} photos`;

  if (listing.categoryId !== null) {
    if (category === null) fields['categoryId'] = 'No such category';
    else if (!category.leaf) fields['categoryId'] = 'Choose a subcategory';
    else {
      const checked = validateAttributes(listing.attributes as Record<string, unknown>, category.attributes, 'submit');
      if (!checked.ok) Object.assign(fields, checked.fields);
    }
  }

  if (listing.dailyCents !== null) {
    try {
      validatePricing({
        dailyCents: listing.dailyCents as ListingPricing['dailyCents'],
        weeklyDiscountPercent: listing.weeklyDiscountPercent,
        depositCents: listing.depositCents as ListingPricing['depositCents'],
        minDays: listing.minDays,
        maxDays: listing.maxDays,
      });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      const field = error.details?.['field'] as keyof ListingPricing;
      fields[field] = PRICE_MESSAGES[field];
    }
  }
  return fields;
}

/** 400 LISTING_INCOMPLETE with the fields and the builder steps they belong to. */
export function incomplete(fields: Record<string, string>): AppError {
  const steps: ListingStep[] = [...new Set(Object.keys(fields).map(stepOfField))];
  return new AppError('LISTING_INCOMPLETE', 400, undefined, fields, { steps });
}
