import type { AvailableItem } from '@yoyo/shared';
import { localePath, profilePath } from '../seo';

const CONDITION: Record<string, string> = {
  NEW: 'https://schema.org/NewCondition',
  LIKE_NEW: 'https://schema.org/UsedCondition',
  GOOD: 'https://schema.org/UsedCondition',
  FAIR: 'https://schema.org/UsedCondition',
};

const euros = (cents: number) => (cents / 100).toFixed(2);

/**
 * schema.org Product with an Offer for an item page: texts as the owner wrote them (in the item's
 * own language, like the page's `<html lang>`), the daily price as a unit price per day, the canonical
 * address. Never the exact place: only the city.
 */
export function itemJsonLd(item: AvailableItem, origin: string, canonicalPath: string): object {
  const { listing, owner } = item;
  const url = `${origin}${canonicalPath}`;
  const price = euros(listing.dailyCents ?? 0);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    ...(listing.description ? { description: listing.description } : {}),
    ...(listing.photos.length > 0 ? { image: listing.photos.map((photo) => photo.urls.full) } : {}),
    ...(listing.condition ? { itemCondition: CONDITION[listing.condition] } : {}),
    url,
    offers: {
      '@type': 'Offer',
      url,
      price,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      businessFunction: 'https://purl.org/goodrelations/v1#LeaseOut',
      priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'EUR', unitCode: 'DAY' },
      ...(listing.city ? { availableAtOrFrom: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: listing.city, addressCountry: 'LV' } } } : {}),
      seller: { '@type': 'Person', name: owner.name, url: `${origin}${localePath('en', profilePath(owner.id))}` },
    },
  };
}
