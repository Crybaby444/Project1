import { render, screen } from '@testing-library/react';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('takes its accessible name from label', () => {
    render(
      <IconButton label="Save item">
        <svg aria-hidden="true" />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Save item' })).toBeInTheDocument();
  });
});
