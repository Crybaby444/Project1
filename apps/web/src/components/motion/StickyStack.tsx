import { Children, type CSSProperties, type ReactNode } from 'react';

type StickyStackProps = {
  /** One child per card; each pins a little lower than the one before and covers it. */
  children: ReactNode;
  /** Accessible name of the list ("How it works"). */
  label?: string;
  className?: string;
};

/**
 * Cards that pin and stack on top of each other while scrolling ("how it works" steps). Pure CSS:
 * `position: sticky` with a growing top offset (motion.css, `[data-stack-item]`), so there is no
 * script and no layout shift. Each card tips a little like a sticker laid on the pile. With reduced
 * motion, or on screens too short for a pinned card, it is an ordinary list.
 */
export function StickyStack({ children, label, className = '' }: StickyStackProps) {
  const items = Children.toArray(children);
  return (
    <ol aria-label={label} data-sticky-stack="" className={`flex flex-col gap-6 ${className}`}>
      {items.map((child, index) => (
        <li
          key={index}
          data-stack-item=""
          style={{ '--i': index, '--tip': index % 2 === 0 ? '-1.2deg' : '1deg' } as CSSProperties}
        >
          {child}
        </li>
      ))}
    </ol>
  );
}
