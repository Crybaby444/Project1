import type { HTMLAttributes, ReactNode } from 'react';

type SheetTag = 'section' | 'div' | 'aside' | 'article' | 'li' | 'header' | 'form';

type SheetProps = HTMLAttributes<HTMLElement> & {
  as?: SheetTag;
  /**
   * `quiet`: a 1px edge at 15% (almost every block). `ring`: a 2px ink edge, for the one block that waits
   * for you (your turn in a deal, the booking you are making). `danger`: a 2px warning edge (a dispute).
   */
  tone?: 'quiet' | 'ring' | 'danger';
  /** `md` 20px (24px from 640px) for a block; `sm` 16px (20px) for a list item or a compact card; `none` for a list that pads its own rows. */
  pad?: 'md' | 'sm' | 'none';
  children: ReactNode;
};

const TONE = {
  quiet: 'border border-ink/15',
  ring: 'border-2 border-ink',
  danger: 'border-2 border-[var(--danger)]',
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
    <Tag className={`sheet rounded-media ${TONE[tone]} ${PAD[pad]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
