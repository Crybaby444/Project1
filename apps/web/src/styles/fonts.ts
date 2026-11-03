import { Onest, Unbounded } from 'next/font/google';

/**
 * The single place where fonts are chosen (DESIGN.md "Project adaptations" §5).
 * Both faces cover Latin Extended (Latvian) and Cyrillic (Russian).
 * Swap in licensed Lateral / Aeonik Pro here later; components only use the
 * `font-display` / `font-body` utilities, which read these variables.
 */
export const displayFont = Unbounded({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['800', '900'],
  variable: '--font-display-face',
  display: 'swap',
});

export const bodyFont = Onest({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['500', '700'],
  variable: '--font-body-face',
  display: 'swap',
});

/** Class names that define both font variables on <html>. */
export const fontVariables = `${displayFont.variable} ${bodyFont.variable}`;
