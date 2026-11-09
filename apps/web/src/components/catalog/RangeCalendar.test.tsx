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
    const taken = screen.getByRole('button', { name: /^Thursday, December 10, 2026, taken/ });
    expect(taken).toHaveAttribute('aria-disabled', 'true');
    await user.click(taken);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter on the first and the last day picks the period, named start and end', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Picker onChange={onChange} />);
    screen.getByRole('button', { name: /^Tuesday, December 1, 2026/ }).focus();
    await user.keyboard('{ArrowRight}{Enter}{ArrowRight}{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-12-02', end: '2026-12-04' });
    expect(screen.getByRole('button', { name: /December 2, 2026, first day/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /December 4, 2026, last day/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a period across a taken day starts over; an earlier day becomes the start', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Picker onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /^Wednesday, December 9, 2026/ }));
    await user.click(screen.getByRole('button', { name: /^Friday, December 11, 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-12-11', end: null });
    await user.click(screen.getByRole('button', { name: /^Monday, December 7, 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-12-07', end: null });
  });

  it('Page Down moves to the next month, past days cannot be picked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Picker onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Monday, November 30, 2026|^Tuesday, December 1, 2026/ })).toBeInTheDocument();
    screen.getByRole('button', { name: /^Tuesday, December 1, 2026/ }).focus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('button', { name: /^Friday, January 1, 2027/ })).toHaveFocus();
  });
});
