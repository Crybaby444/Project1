import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { HeroYoyo, type HeroItem } from './HeroYoyo';

const items: HeroItem[] = [
  { id: 'a', title: 'Cordless drill', href: '/listings/a-cordless-drill', photo: '/a.jpg', price: '€6 / day', place: 'Rīga, Teika', demo: false },
  { id: 'b', title: 'Camping tent', href: '/listings/b-camping-tent', photo: '/b.jpg', price: '€9 / day', place: 'Rīga, Imanta', demo: true },
];

describe('HeroYoyo (the home’s yo-yo)', () => {
  it('holds a real item that leads to its page, and brings another one on request', async () => {
    const api = fakeApi(meRoute(null));
    renderWithSession(<HeroYoyo items={items} />, { client: api.client, hasSession: false });
    expect(screen.getByRole('link', { name: 'Cordless drill, €6 / day' })).toHaveAttribute('href', '/listings/a-cordless-drill');
    expect(screen.getByText('Rīga, Teika')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: en.market.hero.next }));
    // The next thing arrives at the bottom of the dip, marked as an example when it is one.
    expect(await screen.findByRole('link', { name: 'Camping tent, €9 / day' })).toBeInTheDocument();
    expect(screen.getByText(en.market.hero.example)).toBeInTheDocument();
  });

  it('with nothing to show still hangs the mark, and offers no button', () => {
    const api = fakeApi(meRoute(null));
    renderWithSession(<HeroYoyo items={[]} />, { client: api.client, hasSession: false });
    expect(screen.queryByRole('button', { name: en.market.hero.next })).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
