import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { emptyValues } from '@/lib/listings/listing-checks';
import { renderWithIntl } from '@/test/render';
import { ListingPreview } from './ListingPreview';

const values = {
  ...emptyValues(),
  title: 'PlayStation 5',
  condition: 'LIKE_NEW' as const,
  dailyCents: 1500,
  depositCents: 10000,
  weeklyDiscountPercent: 10,
  city: 'Rīga',
  district: 'Centrs',
  lat: 56.949649,
  lng: 24.105186,
};

describe('ListingPreview', () => {
  it('shows the card as renters will see it', () => {
    renderWithIntl(
      <ListingPreview
        values={values}
        cover={{ thumb: '/t', card: '/c', full: '/f' }}
        categoryName="Electronics · Game consoles"
      />,
    );
    expect(screen.getByText('PlayStation 5')).toBeVisible();
    expect(screen.getByText('Electronics · Game consoles')).toBeVisible();
    expect(screen.getByText(en.listingCondition.LIKE_NEW)).toBeVisible();
    expect(screen.getByText('€15 a day')).toBeVisible();
    expect(screen.getByText('Deposit €100')).toBeVisible();
    expect(screen.getByText('−10% for 7+ days')).toBeVisible();
    expect(screen.getByText('Rīga, Centrs')).toBeVisible();
    expect(document.querySelector('img')).toHaveAttribute('src', '/c');
  });

  it('never shows the exact point, in text or in the markup', () => {
    const { container } = renderWithIntl(<ListingPreview values={values} cover={null} categoryName={null} />);
    expect(container.innerHTML).not.toMatch(/56[.,]9|24[.,]1/);
  });

  it('has friendly placeholders before anything is filled in', () => {
    renderWithIntl(<ListingPreview values={emptyValues()} cover={null} categoryName={null} />);
    expect(screen.getByText(en.builder.preview.noTitle)).toBeVisible();
    expect(screen.getByText(en.builder.preview.noPhoto)).toBeVisible();
    expect(screen.getByText(en.builder.preview.noPrice)).toBeVisible();
    expect(screen.getByText(en.builder.preview.noPlace)).toBeVisible();
  });
});
