import type { CSSProperties } from 'react';

type LetterRiseProps = {
  text: string;
  className?: string;
  /** Delay between letters, in ms. */
  stagger?: number;
};

/**
 * A headline that rises in letter by letter when the page loads (motion.css, `[data-rise-word]`,
 * `[data-letter]`): each word lifts into place while its letters fade in one after another. Pure
 * CSS, so it plays even before the page hydrates.
 *
 * The text is in the page exactly once, so nothing is duplicated and nothing needs an `aria-label`.
 * Only the words are boxes (inline-block, which is what can move); the letters stay plain inline
 * text, so the heading keeps its kerning and assistive tech reads it as words, not "N e w". A word
 * box is never wider than the line, so an overlong word still hyphenates inside it. With reduced
 * motion the text is simply there.
 */
export function LetterRise({ text, className = '', stagger = 28 }: LetterRiseProps) {
  let letter = 0;
  const parts = text.split(/(\s+)/).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (/^\s+$/.test(part)) return ' ';
        const first = letter;
        return (
          <span
            key={index}
            data-rise-word=""
            style={{ '--i': first, '--stagger': `${stagger}ms` } as CSSProperties}
          >
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
        );
      })}
    </span>
  );
}
