'use client';

import { Fragment, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export type SelectOption = { value: string; label: string; lang?: string; disabled?: boolean; /** Options with the same group follow each other under its heading. */ group?: string };

type SelectProps = {
  value: string;
  options: SelectOption[];
  onChange(value: string): void;
  id?: string;
  /** Sends the value with a plain form submit (a hidden input). */
  name?: string;
  disabled?: boolean;
  /** Shown while nothing is chosen (value ''). */
  placeholder?: string;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  onBlur?(): void;
};

/**
 * A select in the site's own style (v16): the pill field with a turning chevron and a hairline panel,
 * instead of the browser's native list. The W3C APG "select-only combobox": the focus stays on the
 * combobox, the arrows, Home and End move through the options, Enter, Space or Tab pick, Escape
 * closes without picking, and typing jumps to the option that starts with the letters.
 */
export function Select({
  value,
  options,
  onChange,
  id,
  name,
  disabled,
  placeholder,
  className = '',
  onBlur,
  ...aria
}: SelectProps) {
  const auto = useId();
  const boxId = id ?? `${auto}-box`;
  const listId = `${auto}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const chosen = options.findIndex((o) => o.value === value);
  const current = options[chosen];

  const enabled = (i: number) => options[i] !== undefined && !options[i]!.disabled;
  const first = options.findIndex((_, i) => enabled(i));
  const lastEnabled = options.length - 1 - [...options].reverse().findIndex((o) => !o.disabled);
  /** The next enabled option from `i` in direction `dir`, or `i` itself at the end. */
  const step = (i: number, dir: 1 | -1) => {
    for (let j = i + dir; j >= 0 && j < options.length; j += dir) if (enabled(j)) return j;
    return i;
  };
  const show = useCallback(
    (at?: number) => {
      setActive(at ?? (chosen >= 0 ? chosen : Math.max(0, first)));
      setOpen(true);
    },
    [chosen, first],
  );
  const pick = (index: number) => {
    const option = options[index];
    if (option?.disabled) return;
    setOpen(false);
    if (option && option.value !== value) onChange(option.value);
  };

  // A click anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  // Keep the active option in view in a long list.
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, listId]);

  const typeahead = (key: string) => {
    const now = Date.now();
    typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : '') + key.toLowerCase(), at: now };
    const from = open ? active : Math.max(0, chosen);
    const order = [...options.keys()].map((i) => (from + 1 + i) % options.length);
    const hit = order.find((i) => enabled(i) && options[i]!.label.toLowerCase().startsWith(typed.current.text))
      ?? order.find((i) => enabled(i) && options[i]!.label.toLowerCase().startsWith(key.toLowerCase()));
    if (hit === undefined) return;
    if (open) setActive(hit);
    else show(hit);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) show();
        else setActive((i) => step(i, 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) show();
        else setActive((i) => step(i, -1));
        return;
      case 'Home':
        if (!open) return;
        event.preventDefault();
        setActive(Math.max(0, first));
        return;
      case 'End':
        if (!open) return;
        event.preventDefault();
        setActive(lastEnabled);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) pick(active);
        else show();
        return;
      case 'Escape':
        if (!open) return;
        event.preventDefault();
        setOpen(false);
        return;
      case 'Tab':
        if (open) pick(active);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typeahead(event.key);
    }
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        id={boxId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        {...aria}
        className="rounded-pill border-ink bg-surface text-ink flex min-h-11 w-full items-center justify-between gap-3 border px-4 text-left text-base transition-[border-color,box-shadow] duration-200 aria-[invalid=true]:border-2 disabled:opacity-55"
      >
        <span lang={current?.lang} className={`min-w-0 truncate ${current ? '' : 'text-ink/60'}`}>
          {current?.label ?? placeholder ?? ''}
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={boxId}
          tabIndex={-1}
          className="border-ink/15 bg-surface text-ink rounded-media animate-pop-in absolute inset-x-0 top-full z-40 mt-2 max-h-72 origin-top overflow-y-auto border p-1.5 shadow-[0_18px_40px_-24px_rgba(10,11,14,0.45)]"
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const heading = option.group && option.group !== options[index - 1]?.group ? option.group : null;
            return (
              <Fragment key={option.value}>
              {heading ? (
                <li role="presentation" className="text-ink/70 px-4 pt-3 pb-1 text-xs font-bold tracking-[0.08em] uppercase">
                  {heading}
                </li>
              ) : null}
              <li
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                lang={option.lang}
                onPointerDown={(event) => event.preventDefault()}
                onPointerMove={() => enabled(index) && setActive(index)}
                onClick={() => pick(index)}
                className={`rounded-pill flex min-h-11 items-center ${option.disabled ? 'text-ink/45 cursor-default' : 'cursor-pointer'} justify-between gap-3 px-4 text-base transition-colors duration-150 ${
                  index === active ? 'bg-mist' : ''
                } ${selected ? 'font-bold' : ''}`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {selected ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                ) : null}
              </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
