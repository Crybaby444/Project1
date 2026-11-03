import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('uses the label as its accessible name', async () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Save item" onClick={onClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save item' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
