import { screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { renderWithIntl } from '@/test/render';
import { RetryAfterNotice } from './RetryAfterNotice';

const text = (seconds: number) => en.errors.retryIn.replace('{seconds}', String(seconds));

describe('RetryAfterNotice', () => {
  it('shows the seconds ticking down but announces the wait only once, not every second', () => {
    const view = renderWithIntl(<RetryAfterNotice seconds={30} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(text(30));

    view.rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <RetryAfterNotice seconds={29} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(text(29))).toBeVisible();
    // What a screen reader hears from the live region did not change with the tick.
    expect(screen.getByRole('status')).toHaveTextContent(text(30));
    expect(screen.getByRole('status')).not.toHaveTextContent(text(29));
  });

  it('shows nothing once the wait is over', () => {
    renderWithIntl(<RetryAfterNotice seconds={0} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
