import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Marquee } from './Marquee';

describe('Marquee', () => {
  it('repeats its items twice for a seamless loop', () => {
    render(<Marquee items={['Rent a PS5', 'Rent a drill']} />);
    expect(screen.getAllByText('Rent a PS5')).toHaveLength(2);
  });

  it('hides the visual duplicate from assistive tech, so each item is read once', () => {
    render(<Marquee items={['Rent a PS5', 'Rent a drill']} />);
    expect(screen.getAllByText('Rent a PS5')[1]!.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
