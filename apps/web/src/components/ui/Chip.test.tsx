import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip';

describe('Chip', () => {
  it('asks to become pressed when it is off', async () => {
    const onChange = vi.fn();
    render(
      <Chip pressed={false} onPressedChange={onChange}>
        Tools
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: 'Tools' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('asks to be released when it is on', async () => {
    const onChange = vi.fn();
    render(
      <Chip pressed onPressedChange={onChange} color="sun">
        Camping
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: 'Camping' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('toggles from the keyboard too', async () => {
    const onChange = vi.fn();
    render(
      <Chip pressed={false} onPressedChange={onChange}>
        Sports
      </Chip>,
    );
    screen.getByRole('button', { name: 'Sports' }).focus();
    await userEvent.keyboard('[Space]');
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
