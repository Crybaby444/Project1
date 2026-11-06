import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ribbon, type RibbonVariant } from './Ribbon';

const VARIANTS: RibbonVariant[] = ['hero', 'loop', 'wave'];

describe('Ribbon', () => {
  it.each(VARIANTS)('%s is decoration only, with its box reserved before it paints', (variant) => {
    const { container } = render(<Ribbon variant={variant} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox');
    // Width and aspect ratio come from the markup, so the page does not jump when it renders.
    expect(svg.style.aspectRatio).not.toBe('');
  });

  it.each(VARIANTS)('%s is flat strokes and grain, never a gradient (DESIGN.md)', (variant) => {
    const { container } = render(<Ribbon variant={variant} />);
    expect(container.innerHTML).not.toMatch(/gradient/i);
    // Underside, body and highlight: three strokes along the same tube.
    expect(container.querySelectorAll('[data-ribbon-layer]')).toHaveLength(3);
  });

  it('gives each ribbon its own grain filter id, so two on a page do not clash', () => {
    const { container } = render(
      <>
        <Ribbon variant="hero" />
        <Ribbon variant="wave" />
      </>,
    );
    const ids = [...container.querySelectorAll('filter')].map((filter) => filter.id);
    expect(new Set(ids).size).toBe(2);
  });
});
