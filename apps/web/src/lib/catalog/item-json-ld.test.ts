import { describe, expect, it } from 'vitest';
import { availableItem } from '@/test/catalog';
import { itemJsonLd } from './item-json-ld';

describe('itemJsonLd', () => {
  it('is a Product with a daily Offer at the canonical address, and only the city', () => {
    const data = itemJsonLd(availableItem({ condition: 'NEW', lat: 1 } as never), 'https://yoyo.rent', '/lv/listings/cm1abcdefg-x') as Record<string, unknown>;
    expect(data).toMatchObject({
      '@type': 'Product',
      name: 'Cordless drill',
      url: 'https://yoyo.rent/lv/listings/cm1abcdefg-x',
      itemCondition: 'https://schema.org/NewCondition',
      image: ['/f1', '/f2', '/f3'],
      offers: {
        '@type': 'Offer',
        price: '15.00',
        priceCurrency: 'EUR',
        priceSpecification: { unitCode: 'DAY', price: '15.00' },
        seller: { name: 'Jānis Ozols', url: 'https://yoyo.rent/u/owner-1' },
      },
    });
    expect(JSON.stringify(data)).not.toMatch(/Centrs|"lat"|"lng"/);
  });
});
