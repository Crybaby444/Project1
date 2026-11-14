import type { DealReviews, PublicReview } from '@yoyo/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithIntl, renderWithSession } from '@/test/render';
import { DealReviewsPanel } from './DealReviewsPanel';
import { ReviewList } from './ReviewList';
import { StarInput } from './StarInput';
import { Stars } from './Stars';

const r = deals.reviews;
const review = (over: Partial<PublicReview> = {}): PublicReview => ({
  id: 'rv1',
  rating: 4,
  itemRating: 5,
  text: 'Easy hand-over, exactly as shown.',
  createdAt: '2026-12-05T10:00:00.000Z',
  author: { id: 'u2', name: 'Rita Renter' },
  authorRole: 'RENTER',
  listing: { id: 'cm1', title: 'Cordless drill' },
  ...over,
});
const state = (over: Partial<DealReviews> = {}): DealReviews => ({
  canReview: true,
  deadline: '2026-12-19T10:00:00.000Z',
  viewerRole: 'RENTER',
  mine: null,
  theirs: null,
  theirsWaiting: false,
  ...over,
});

describe('Stars', () => {
  it('reads as a score out of 5, not as five pictures', () => {
    renderWithIntl(<Stars value={4.5} />);
    expect(screen.getByRole('img', { name: '4.5 of 5' })).toBeInTheDocument();
  });
});

describe('StarInput', () => {
  it('is a group of five radio buttons named by their count', async () => {
    const user = userEvent.setup();
    let value = 0;
    renderWithIntl(<StarInput legend="Stars for Olga" value={value} onChange={(v) => (value = v)} name="person" />);
    const group = screen.getByRole('radiogroup', { name: 'Stars for Olga' });
    expect(within(group).getAllByRole('radio')).toHaveLength(5);
    await user.click(within(group).getByRole('radio', { name: '4 stars' }));
    expect(value).toBe(4);
  });
});

describe('ReviewList', () => {
  it('shows who wrote it, from which side, the stars and the words', () => {
    renderWithIntl(<ReviewList reviews={[review()]} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveTextContent('Rita Renter');
    expect(item).toHaveTextContent(r.role.RENTER);
    expect(within(item).getByRole('img', { name: '4 of 5' })).toBeInTheDocument();
    expect(item).toHaveTextContent('Easy hand-over, exactly as shown.');
  });
});

describe('DealReviewsPanel', () => {
  function renderPanel(reviews: DealReviews, onPost?: (body: unknown) => void) {
    const api = fakeApi({
      ...meRoute(testUser({ id: 'u2' })),
      'GET /api/v1/bookings/b1/reviews': { status: 200, body: reviews },
      'POST /api/v1/bookings/b1/reviews': (body) => {
        onPost?.(body);
        return { status: 201, body: { review: review({ text: (body as { text: string }).text }) } };
      },
    });
    renderWithSession(<DealReviewsPanel bookingId="b1" otherName="Olga Owner" />, { client: api.client });
    return api;
  }

  it('lets the renter score the person and the item and write a few words', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    renderPanel(state(), (body) => (sent = body));
    const person = await screen.findByRole('radiogroup', { name: 'Stars for Olga Owner' });
    await user.click(within(person).getByRole('radio', { name: '5 stars' }));
    await user.click(within(screen.getByRole('radiogroup', { name: r.deal.aboutItem })).getByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByLabelText(r.deal.text), 'Kind owner, the drill worked well.');
    await user.click(screen.getByRole('button', { name: r.deal.submit }));
    await waitFor(() => expect(sent).toEqual({ rating: 5, itemRating: 4, text: 'Kind owner, the drill worked well.' }));
  });

  it('does not ask the owner about the item', async () => {
    renderPanel(state({ viewerRole: 'OWNER' }));
    await screen.findByRole('radiogroup', { name: 'Stars for Olga Owner' });
    expect(screen.queryByRole('radiogroup', { name: r.deal.aboutItem })).toBeNull();
  });

  it('says the other side wrote theirs, without showing it (blind)', async () => {
    renderPanel(state({ theirsWaiting: true }));
    expect(await screen.findByText('Olga Owner has written their review. It shows once you write yours.')).toBeInTheDocument();
  });

  it('shows both reviews once they are public, and no form', async () => {
    renderPanel(state({ canReview: false, mine: review(), theirs: review({ id: 'rv2', author: { id: 'u1', name: 'Olga Owner' }, authorRole: 'OWNER', itemRating: null, text: 'Careful renter.' }) }));
    expect(await screen.findByText('Careful renter.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: r.deal.submit })).toBeNull();
  });
});

void render;
