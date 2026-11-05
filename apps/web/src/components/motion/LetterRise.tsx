import type { CSSProperties } from 'react';

type LetterRiseProps = {
  text: string;
  className?: string;
  /** Delay between letters, in ms. */
  stagger?: number;
};

/**
 * A headline whose letters rise in one after another when the page loads (motion.css,
 * `[data-letter]`). Pure CSS, so it plays even before the page hydrates. The text content stays the
 * plain text, but give the heading `aria-label={text}` so assistive tech names it as one phrase,
 * not letter by letter. Each word stays one unbreakable unit, so size the headline with
 * displayFit(text, { split: true }) for its longest word. With reduced motion the letters are
 * simply there.
 */
export function LetterRise({ text, className = '', stagger = 28 }: LetterRiseProps) {
  let letter = 0;
  const parts = text.split(/(\s+)/).filter(Boolean);
  return (
    <span className={className}>
      <span data-letter-rise="">
        {parts.map((part, index) =>
          /^\s+$/.test(part) ? (
            ' '
          ) : (
            <span key={index} className="inline-block whitespace-nowrap">
              {Array.from(part).map((char) => {
                const i = letter++;
                return (
                  <span
                    key={i}
                    data-letter=""
                    style={{ '--i': i, '--stagger': `${stagger}ms` } as CSSProperties}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
