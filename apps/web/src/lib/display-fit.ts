import type { CSSProperties } from 'react';

/**
 * Letters in the longest unbreakable piece of `text`. A browser may break a line after a hyphen, so
 * "E-pasts" counts as "E-" and "pasts". Letters are counted as the reader sees them (ģ is one).
 */
export function longestWord(text: string): number {
  const pieces = text.normalize('NFC').split(/\s+|(?<=[-‐‑])/u);
  return Math.max(1, ...pieces.map((piece) => [...piece].length));
}

/**
 * Inline style for the `text-display-fit` utility (globals.css): the display title is sized from
 * the width of its container (an `@container` ancestor) so that its longest word fits on one line,
 * never larger than `max` and never smaller than `min`.
 */
export function displayFit(text: string, { min, max }: { min?: string; max: string }): CSSProperties {
  return {
    '--fit-chars': longestWord(text),
    ...(min ? { '--fit-min': min } : {}),
    '--fit-max': max,
  } as CSSProperties;
}
