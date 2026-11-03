import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { renderWithIntl } from '@/test/render';
import { Marquee } from './Marquee';

function track(): Element {
  return document.querySelector('[data-marquee-track]')!;
}

describe('Marquee', () => {
  it('repeats its items twice for a seamless loop', () => {
    renderWithIntl(<Marquee items={['Rent a PS5', 'Rent a drill']} />);
    expect(screen.getAllByText('Rent a PS5')).toHaveLength(2);
  });

  it('hides the visual duplicate from assistive tech, so each item is read once', () => {
    renderWithIntl(<Marquee items={['Rent a PS5', 'Rent a drill']} />);
    expect(screen.getAllByText('Rent a PS5')[1]!.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('can be paused and resumed with a button, for keyboard and touch users (WCAG 2.2.2)', async () => {
    renderWithIntl(<Marquee items={['Rent a PS5', 'Rent a drill']} />);
    expect(track()).not.toHaveAttribute('data-paused');

    await userEvent.click(screen.getByRole('button', { name: en.marquee.pause }));
    expect(track()).toHaveAttribute('data-paused', 'true');

    await userEvent.click(screen.getByRole('button', { name: en.marquee.resume }));
    expect(track()).not.toHaveAttribute('data-paused');
  });
});
