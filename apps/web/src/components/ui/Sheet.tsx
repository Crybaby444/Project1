import type { HTMLAttributes, ReactNode } from 'react';

type SheetTag = 'section' | 'div' | 'aside' | 'article' | 'li' | 'header' | 'form';

type SheetProps = HTMLAttributes<HTMLElement> & {
  as?: SheetTag;
  /**
   * `quiet`: a 1px edge at 15% (almost every block). `ring`: a 2px ink edge, for a block that waits for you
   * (the booking you are making). `danger`: a 2px warning edge (a dispute). `night`: the page's moment, the
   * one block that matters most right now, in the night with the one blue light (globals.css `moment`); a
   * page has one at most.
   */
  tone?: 'quiet' | 'ring' | 'danger' | 'night';
  /** `md` 20px (24px from 640px) for a block; `sm` 16px (20px) for a list item or a compact card; `none` for a list that pads its own rows. */
  pad?: 'md' | 'sm' | 'none';
  children: ReactNode;
};

const TONE = {
  quiet: 'sheet border border-ink/15',
  ring: 'sheet border-2 border-ink',
  danger: 'sheet border-2 border-[var(--danger)]',
  night: 'moment',
} as const;

const PAD = { md: 'p-5 sm:p-6', sm: 'p-4 sm:p-5', none: '' } as const;

/**
 * The one surface of the site (DESIGN.md "Surfaces"): a sheet a little lighter than the page, with a lit
 * top edge and a soft fall of shadow (`.sheet` in globals.css), card corners and an edge by its role.
 * Every block of an account page, a deal, a booking or the settings is one of these; nothing is nested in
 * another sheet.
 */
export function Sheet({ as: Tag = 'section', tone = 'quiet', pad = 'md', className = '', children, ...rest }: SheetProps) {
  return (
    <Tag className={`rounded-media ${TONE[tone]} ${PAD[pad]} ${className}`} {...rest}>
      {tone === 'night' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1/2 -right-1/4 -z-10 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(77_124_255/0.42),transparent)]"
        />
      )}
      {children}
    </Tag>
  );
}
