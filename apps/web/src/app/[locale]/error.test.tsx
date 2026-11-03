import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import ru from '../../../messages/ru.json';
import { renderWithIntl } from '@/test/render';
import LocaleError from './error';

describe('error page', () => {
  it('explains the failure in the visitor language and lets them retry', async () => {
    const reset = vi.fn();
    renderWithIntl(<LocaleError error={new Error('boom')} reset={reset} />);

    expect(screen.getByRole('heading', { level: 1, name: en.error.title })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: en.error.retry }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: en.error.back })).toHaveAttribute('href', '/');
  });

  it('keeps the visitor on their language', () => {
    renderWithIntl(<LocaleError error={new Error('boom')} reset={() => {}} />, 'ru');
    expect(screen.getByRole('heading', { level: 1, name: ru.error.title })).toBeVisible();
    expect(screen.getByRole('link', { name: ru.error.back })).toHaveAttribute('href', '/ru');
  });

  it('never shows the raw error message to visitors', () => {
    renderWithIntl(<LocaleError error={new Error('SELECT * FROM secrets failed')} reset={() => {}} />);
    expect(screen.queryByText(/SELECT \* FROM secrets/)).toBeNull();
  });
});
