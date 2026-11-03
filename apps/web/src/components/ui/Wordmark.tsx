import type { HTMLAttributes } from 'react';

type WordmarkProps = HTMLAttributes<HTMLSpanElement>;

/** "YOYO" set in the display face. Announced as "Yoyo". */
export function Wordmark({ className = '', ...rest }: WordmarkProps) {
  return (
    <span
      role="img"
      aria-label="Yoyo"
      className={`font-display leading-[0.8] font-extrabold tracking-normal uppercase ${className}`}
      {...rest}
    >
      YOYO
    </span>
  );
}
