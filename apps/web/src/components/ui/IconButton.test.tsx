import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('is announced by its label, not by the decorative icon', () => {
    render(
      <IconButton label="Save item">
        <svg aria-hidden="true" />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Save item' })).toBeInTheDocument();
  });

  it('calls onClick and never submits a surrounding form', async () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <IconButton label="Favourite" onClick={onClick}>
          <svg aria-hidden="true" />
        </IconButton>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Favourite' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
