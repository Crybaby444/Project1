import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubMatchMedia } from '@/test/match-media';
import { Card } from './Card';

function placeCard(card: HTMLElement): void {
  // A 200×100 card at the top-left corner of the viewport.
  card.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
}

describe('Card', () => {
  it('tilts toward the pointer by at most 4 degrees, and settles when the pointer leaves', () => {
    render(<Card interactive>Drill</Card>);
    const card = screen.getByText('Drill');
    placeCard(card);

    fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'mouse' }); // top-right corner
    expect(card.style.getPropertyValue('--ry')).toBe('4deg');
    expect(card.style.getPropertyValue('--rx')).toBe('4deg');

    fireEvent.pointerMove(card, { clientX: 100, clientY: 50, pointerType: 'mouse' }); // centre
    expect(card.style.getPropertyValue('--ry')).toBe('0deg');

    fireEvent.pointerLeave(card);
    expect(card.style.getPropertyValue('--rx')).toBe('0deg');
    expect(card.style.getPropertyValue('--ry')).toBe('0deg');
  });

  it('does not tilt for touch, where the pointer moves while scrolling', () => {
    render(<Card interactive>Kayak</Card>);
    const card = screen.getByText('Kayak');
    placeCard(card);
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'touch' });
    expect(card.style.getPropertyValue('--ry')).toBe('');
  });

  it('stays still for people who prefer reduced motion', () => {
    stubMatchMedia(true);
    render(<Card interactive>Tent</Card>);
    const card = screen.getByText('Tent');
    placeCard(card);
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'mouse' });
    expect(card.style.getPropertyValue('--ry')).toBe('');
  });

  it('does not react to the pointer unless interactive', () => {
    render(<Card>Static</Card>);
    const card = screen.getByText('Static');
    placeCard(card);
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'mouse' });
    expect(card.style.getPropertyValue('--ry')).toBe('');
  });
});
