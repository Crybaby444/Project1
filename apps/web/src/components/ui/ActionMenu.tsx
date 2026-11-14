'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type MenuAction = { label: string; onSelect(): void; disabled?: boolean };

const ITEM =
  'flex min-h-10 w-full items-center rounded-pill px-4 text-left text-sm font-bold whitespace-nowrap transition-colors duration-150 ease-yoyo hover:bg-mist focus-visible:bg-mist disabled:opacity-55';

/**
 * A small WAI-ARIA menu button: the trigger opens a list of actions; arrows, Home and End move,
 * Enter picks, Esc closes back on the trigger, Tab or a click elsewhere closes it.
 */
export function ActionMenu({
  label,
  actions,
  children,
  className = '',
  align = 'right',
}: {
  /** The trigger's accessible name. */
  label: string;
  actions: MenuAction[];
  /** The trigger's visible content (an icon). */
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const items = () =>
    Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const go = (to: number) => {
      event.preventDefault();
      all[(to + all.length) % all.length]?.focus();
    };
    if (event.key === 'ArrowDown') go(index + 1);
    else if (event.key === 'ArrowUp') go(index - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(all.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === 'Tab') setOpen(false);
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="border-ink bg-surface text-ink rounded-pill ease-yoyo inline-grid size-10 place-items-center border transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96]"
      >
        {children}
      </button>
      {open && (
        <ul
          ref={list}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className={`border-ink/15 bg-surface animate-pop-in rounded-media absolute top-full z-40 mt-2 min-w-48 border p-2 ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          }`}
        >
          {actions.map((action) => (
            <li key={action.label} role="none">
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                  action.onSelect();
                }}
                className={ITEM}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
