import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/render';
import { ToastProvider } from '@/components/ui/Toast';
import { BookingLinkButton } from './BookingLinkButton';

describe('BookingLinkButton', () => {
  it("shares the item's own page (photos, words and booking), in the page's language", () => {
    renderWithIntl(<ToastProvider><BookingLinkButton listingId="listing-1" /></ToastProvider>);
    expect(screen.getByRole('button', { name: 'Link to the item' })).toHaveAttribute('data-booking-link', '/listings/listing-1');
  });

  it('keeps the language prefix for Russian', () => {
    renderWithIntl(<ToastProvider><BookingLinkButton listingId="listing-1" /></ToastProvider>, 'ru');
    expect(screen.getByRole('button', { name: 'Ссылка на вещь' })).toHaveAttribute('data-booking-link', '/ru/listings/listing-1');
  });
});
