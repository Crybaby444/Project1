import { fireEvent, render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders its content', () => {
    render(<Card>Cordless drill</Card>);
    expect(screen.getByText('Cordless drill')).toBeInTheDocument();
  });

  it('tilts toward the cursor when interactive and resets on leave', () => {
    render(<Card interactive>Tent</Card>);
    const card = screen.getByText('Tent');
    card.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }) as DOMRect;
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0 });
    expect(card.style.getPropertyValue('--ry')).toBe('5deg');
    expect(card.style.getPropertyValue('--rx')).toBe('5deg');
    fireEvent.pointerLeave(card);
    expect(card.style.getPropertyValue('--ry')).toBe('0deg');
  });
});
