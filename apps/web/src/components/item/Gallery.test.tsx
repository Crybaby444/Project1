import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { availableItem } from '@/test/catalog';
import { renderWithIntl } from '@/test/render';
import { Gallery } from './Gallery';

const g = en.item.gallery;
const photos = availableItem().listing.photos;

describe('Gallery', () => {
  it('a thumbnail changes the main photo and is marked current', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Gallery listingId="l1" title="Drill" photos={photos} />);
    expect(screen.getByAltText('Drill, photo 1 of 3')).toHaveAttribute('data-shared-photo');
    await user.click(screen.getByRole('button', { name: 'Show photo 2 of 3' }));
    expect(screen.getByAltText('Drill, photo 2 of 3')).toHaveAttribute('src', '/c2');
    expect(screen.getByRole('button', { name: 'Show photo 2 of 3' })).toHaveAttribute('aria-current', 'true');
  });

  it('full screen: arrows move on, the counter follows, Esc closes and gives the focus back', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Gallery listingId="l1" title="Drill" photos={photos} />);
    const open = screen.getByRole('button', { name: 'All 3 photos' });
    await user.click(open);
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: g.previous }));
    await user.click(screen.getByRole('button', { name: g.previous }));
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
    // Esc is the dialog's own cancel event (jsdom has no native one).
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByText('3 of 3')).toBeNull();
    expect(open).toHaveFocus();
  });

  it('says so when there are no photos', () => {
    renderWithIntl(<Gallery listingId="l1" title="Drill" photos={[]} />);
    expect(screen.getByText(g.noPhotos)).toBeInTheDocument();
  });
});
