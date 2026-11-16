'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('dialog');
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
      // A click on the dimmed backdrop (the dialog element itself, outside its box) closes it too.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`relative border-ink/15 bg-surface text-ink animate-pop-in rounded-media m-auto w-[calc(100%-2rem)] border p-6 backdrop:bg-black/60 sm:p-8 ${wide ? 'max-w-2xl' : 'max-w-md'}`}
    >
      <h2 id={titleId} className="font-display mb-3 pr-12 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95] font-black uppercase [overflow-wrap:anywhere]">
        {title}
      </h2>
      {children}
      {/* Last in order, so opening still focuses the dialog's first field; shown top right (owner, 2026-11-16:
          a dialog you can open must have a visible way out). */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('close')}
        className="border-ink/20 hover:bg-mist absolute top-3 right-3 inline-grid size-10 place-items-center rounded-full border transition-colors"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </dialog>
  );
}
