import { render, screen } from '@testing-library/react';
import { Marquee } from './Marquee';

describe('Marquee', () => {
  it('duplicates the content and hides the copy from screen readers', () => {
    render(<Marquee items={['Rent a PS5', 'Rent a drill']} />);
    const copies = screen.getAllByText('Rent a PS5');
    expect(copies).toHaveLength(2);
    expect(copies[0]!.closest('[aria-hidden="true"]')).toBeNull();
    expect(copies[1]!.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
