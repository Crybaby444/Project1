import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { availableItem } from '@/test/catalog';
import { renderWithIntl } from '@/test/render';
import { initials, OwnerCard } from './OwnerCard';

describe('OwnerCard', () => {
  it('shows what everyone may see, no reviews yet, and links to the profile', () => {
    const { container } = renderWithIntl(<OwnerCard owner={availableItem().owner} />);
    expect(screen.getByRole('heading', { name: 'Jānis Ozols' })).toBeInTheDocument();
    expect(screen.getByText('Rīga · on Yoyo since March 2026')).toBeInTheDocument();
    expect(screen.getByText(en.item.owner.emailVerified)).toBeInTheDocument();
    expect(screen.queryByText(en.item.owner.phoneVerified)).toBeNull();
    expect(screen.getByText('2 deals')).toBeInTheDocument();
    expect(screen.getByText(en.item.owner.noReviews)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'More from Jānis Ozols' })).toHaveAttribute('href', '/u/owner-1');
    expect(container.textContent).not.toMatch(/@|\+371/);
  });

  it('makes initials of up to two words', () => {
    expect(initials('anna bērziņa kalniņa')).toBe('AB');
    expect(initials('Ēriks')).toBe('Ē');
  });
});
