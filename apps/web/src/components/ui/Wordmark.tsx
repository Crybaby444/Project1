import type { CSSProperties } from 'react';

type WordmarkProps = {
  className?: string;
  /** The hero version: the letters rise in one after another on load (motion.css, `[data-letter]`). */
  animated?: boolean;
};

/** The "YOYO" wordmark in the display face; assistive tech reads it as "Yoyo". */
export function Wordmark({ className = '', animated = false }: WordmarkProps) {
  return (
    <span
      role="img"
      aria-label="Yoyo"
      className={`font-display leading-[0.8] font-black tracking-normal uppercase ${className}`}
    >
      {animated
        ? Array.from('YOYO', (letter, index) => (
            <span key={index} data-letter="" style={{ '--i': index, '--stagger': '70ms' } as CSSProperties}>
              {letter}
            </span>
          ))
        : 'YOYO'}
    </span>
  );
}
