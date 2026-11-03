import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('renders content without tilt by default', () => {
    render(<Card>Drill</Card>);
    expect(screen.getByText('Drill')).not.toHaveAttribute('data-interactive');
  });

  it('tilts toward the pointer when interactive, at most 5 degrees', () => {
    render(<Card interactive>Tent</Card>);
    const card = screen.getByText('Tent');
    card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0 });
    expect(card.style.getPropertyValue('--ry')).toBe('5deg');
    expect(card.style.getPropertyValue('--rx')).toBe('5deg');
    fireEvent.pointerLeave(card);
    expect(card.style.getPropertyValue('--ry')).toBe('0deg');
  });
});

describe('Card colour', () => {
  it('replaces the surface fill with a sticker colour', () => {
    render(<Card color="lavender">Featured</Card>);
    const card = screen.getByText('Featured');
    expect(card.className).toContain('bg-sticker-lavender');
    expect(card.className).not.toContain('bg-surface');
  });
});
