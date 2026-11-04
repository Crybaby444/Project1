import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DatePeriod } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { renderWithIntl } from '@/test/render';
import { UnavailabilityCalendar } from './UnavailabilityCalendar';

const c = en.builder.calendar;

function renderCalendar(periods: DatePeriod[] = []) {
  const onChange = vi.fn();
  renderWithIntl(
    <UnavailabilityCalendar periods={periods} today="2026-12-02" onChange={onChange} readOnly={false} />,
  );
  return onChange;
}

const day = (name: RegExp | string) => screen.getByRole('button', { name });

describe('UnavailabilityCalendar', () => {
  it('opens on this month with today as the day to tab to', () => {
    renderCalendar();
    expect(screen.getByRole('grid', { name: 'December 2026' })).toBeInTheDocument();
    expect(day(/^Wednesday, December 2, 2026/)).toHaveAttribute('tabindex', '0');
    expect(day(/^Thursday, December 3, 2026/)).toHaveAttribute('tabindex', '-1');
  });

  it('moves between days with the arrow keys and between months with Page Down', async () => {
    const user = userEvent.setup();
    renderCalendar();
    day(/^Wednesday, December 2, 2026/).focus();
    await user.keyboard('{ArrowRight}');
    expect(day(/^Thursday, December 3, 2026/)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(day(/^Thursday, December 10, 2026/)).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('grid', { name: 'January 2027' })).toBeInTheDocument();
    expect(day(/^Sunday, January 10, 2027/)).toHaveFocus();
  });

  it('marks a day with Enter, and a period with Shift', async () => {
    const user = userEvent.setup();
    const onChange = renderCalendar();
    day(/^Friday, December 4, 2026/).focus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([{ start: '2026-12-04', end: '2026-12-04' }]);
    fireEvent.click(day(/^Monday, December 7, 2026/), { shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith([{ start: '2026-12-04', end: '2026-12-07' }]);
  });

  it('shows marked days as pressed and in words, and lets past days be', async () => {
    const user = userEvent.setup();
    const onChange = renderCalendar([{ start: '2026-12-05', end: '2026-12-06' }]);
    expect(day(new RegExp(`December 5, 2026, ${c.unavailable}`))).toHaveAttribute('aria-pressed', 'true');
    const yesterday = day(new RegExp(`December 1, 2026, ${c.past}`));
    expect(yesterday).toHaveAttribute('aria-disabled', 'true');
    await user.click(yesterday);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('list', { name: c.list })).toHaveTextContent('Dec 5 – 6, 2026');
  });

  it('makes a period available again from the list', async () => {
    const user = userEvent.setup();
    const onChange = renderCalendar([{ start: '2026-12-05', end: '2026-12-06' }]);
    await user.click(screen.getByRole('button', { name: /^Make Dec 5 – 6, 2026 available again$/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
