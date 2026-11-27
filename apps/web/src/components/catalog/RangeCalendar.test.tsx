import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Range } from '@/lib/catalog/range';
import { renderWithIntl } from '@/test/render';
import { RangeCalendar } from './RangeCalendar';

function Picker({ onChange }: { onChange: (range: Range) => void }) {
  const [value, setValue] = useState<Range | null>(null);
  return (
    <RangeCalendar
      value={value}
      onChange={(range) => {
        setValue(range);
        onChange(range);
      }}
      today="2026-12-01"
      blocked={[{ start: '2026-12-10', end: '2026-12-10' }]}
      twoMonths={false}
    />
  );
}

describe('RangeCalendar', () => {
  it('names taken days and does not pick them', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Picker onChange={onChange} />);
    const taken = screen.getByRole('button', { name: /^Thursday, 10 December 2026, taken/ });
    expect(taken).toHaveAttribute('aria-disabled', 'true');
    await user.click(taken);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter on the first and the last day picks the period, named start and end', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Picker onChange={onChange} />);
    screen.getByRole('button', { name: /^Tuesday, 1 December 2026/ }).focus();
    await user.keyboard('{ArrowRight}{Enter}{ArrowRight}{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-12-02', end: '2026-12-04' });
    expect(screen.getByRole('button', { name: /2 December 2026, first day/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /4 December 2026, last day/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a period across a taken day starts over; an earlier day becomes the start', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Picker onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /^Wednesday, 9 December 2026/ }));
    await user.click(screen.getByRole('button', { name: /^Friday, 11 December 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-12-11', end: null });
    await user.click(screen.getByRole('button', { name: /^Monday, 7 December 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-12-07', end: null });
  });

  it('Page Down moves to the next month, past days cannot be picked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Picker onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Monday, 30 November 2026|^Tuesday, 1 December 2026/ })).toBeInTheDocument();
    screen.getByRole('button', { name: /^Tuesday, 1 December 2026/ }).focus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('button', { name: /^Friday, 1 January 2027/ })).toHaveFocus();
  });
});
