import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders as render } from '@/test/render';
import { Button } from './Button';

describe('Button', () => {
  it('marks a loading button busy and disabled', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('renders a link when given href', () => {
    render(<Button href="/catalog">Browse</Button>);
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/catalog');
  });

  it('defaults to a non-submitting button with the primary variant', () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-variant', 'primary');
  });
});
