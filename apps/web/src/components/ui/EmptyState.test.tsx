import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('says what is empty in a title and a line, with the yo-yo as decoration only', () => {
    const { container } = render(<EmptyState title="No closed deals yet" body="Finished deals land here." />);
    expect(screen.getByRole('heading', { name: 'No closed deals yet' })).toBeInTheDocument();
    expect(screen.getByText('Finished deals land here.')).toBeInTheDocument();
    const art = container.querySelector('svg')!;
    expect(art).toHaveAttribute('aria-hidden', 'true');
    expect(art.getAttribute('class')).toMatch(/motion-reduce/);
  });

  it('takes an action and a heading level', () => {
    render(<EmptyState title="Nothing yet" headingLevel={3} action={<button type="button">Open the catalog</button>} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Nothing yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the catalog' })).toBeInTheDocument();
  });
});
