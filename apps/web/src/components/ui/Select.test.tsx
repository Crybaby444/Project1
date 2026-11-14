import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'lv', label: 'Latviešu' },
  { value: 'ru', label: 'Русский' },
];

function Harness({ onChange = () => {} }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('en');
  return (
    <>
      <label htmlFor="lang">Language</label>
      <Select id="lang" name="locale" value={value} options={OPTIONS} onChange={(v) => { setValue(v); onChange(v); }} />
    </>
  );
}

describe('Select', () => {
  it('is a combobox named by its label, showing the chosen option, closed at first', () => {
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'Language' });
    expect(box).toHaveTextContent('English');
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens on a click and picks an option with the mouse, then closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('combobox', { name: 'Language' }));
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: 'Latviešu' }));
    expect(onChange).toHaveBeenCalledWith('lv');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('Latviešu');
  });

  it('works from the keyboard: arrows move, Enter picks, Escape closes without picking', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const box = screen.getByRole('combobox', { name: 'Language' });
    box.focus();
    await user.keyboard('{ArrowDown}');
    expect(box).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('ru');
    await user.keyboard('{ArrowDown}{Home}{Escape}');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(box).toHaveFocus();
  });

  it('jumps to an option by typing its first letters', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    screen.getByRole('combobox', { name: 'Language' }).focus();
    await user.keyboard('{Enter}l{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('lv');
  });

  it('sends its value with the form', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('input[type="hidden"][name="locale"]')).toHaveValue('en');
  });

  it('shows group headings and skips disabled options from the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="cat">Category</label>
        <Select
          id="cat"
          value=""
          placeholder="Choose"
          onChange={onChange}
          options={[
            { value: 'a', label: 'Drills', group: 'Tools' },
            { value: 'b', label: 'Saws', group: 'Tools', disabled: true },
            { value: 'c', label: 'Tents', group: 'Outdoors' },
          ]}
        />
      </>,
    );
    const box = screen.getByRole('combobox', { name: 'Category' });
    expect(box).toHaveTextContent('Choose');
    box.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('Outdoors')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Saws' })).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('c');
  });
});
