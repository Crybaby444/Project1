'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogProps = {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
  /** A wider dialog, for photos (the crop tool, a gallery). */
  wide?: boolean;
};

/**
 * A modal on the native <dialog> (the page behind is inert): the focus moves to the first control
 * inside, Tab and Shift+Tab stay inside, Esc closes it, and the focus returns to what opened it.
 */
export function Dialog(props: DialogProps) {
  return props.open ? <OpenDialog {...props} /> : null;
}

function OpenDialog({ onClose, title, children, wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      if (dialog.open) dialog.close();
      opener?.focus();
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // Esc: React decides, so the dialog and the state never disagree
        onClose();
      }}
      onKeyDown={onKeyDown}
      className={`border-ink bg-surface text-ink animate-pop-in rounded-media m-auto w-[calc(100%-2rem)] border p-6 backdrop:bg-black/60 sm:p-8 ${wide ? 'max-w-2xl' : 'max-w-md'}`}
    >
      <h2 id={titleId} className="mb-3 text-2xl leading-tight font-bold">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
