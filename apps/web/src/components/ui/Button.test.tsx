import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/render';
import { Button } from './Button';

describe('Button', () => {
  it('is busy and disabled while loading, and ignores clicks', async () => {
    const onClick = vi.fn();
    renderWithIntl(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders a locale-aware link when given href', () => {
    renderWithIntl(<Button href="/catalog">Browse</Button>);
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/catalog');
  });

  it('keeps the Latvian prefix in links on Latvian pages', () => {
    renderWithIntl(<Button href="/catalog">Pārlūkot</Button>, 'lv');
    expect(screen.getByRole('link', { name: 'Pārlūkot' })).toHaveAttribute('href', '/lv/catalog');
  });

  it('does not submit the surrounding form unless asked to', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    renderWithIntl(
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <Button>Preview</Button>
        <Button type="submit">Publish</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
