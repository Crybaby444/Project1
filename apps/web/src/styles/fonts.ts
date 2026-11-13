import { Onest, Sofia_Sans_Extra_Condensed } from 'next/font/google';

/**
 * The single place where fonts are chosen (DESIGN.md "Project adaptations" §5).
 * Both faces cover Latin Extended (Latvian) and Cyrillic (Russian).
 * v16 (owner, 2026-11-13): Sofia Sans Extra Condensed 800/900 for display, Onest for text.
 * Swap in licensed faces here later; components only use the
 * `font-display` / `font-body` utilities, which read these variables.
 */
/*
 * Only the Latin files are preloaded (`subsets` picks what next/font preloads): they draw the YOYO wordmark and English pages,
 * so the hero never swaps fonts and shifts. Latin Extended (Latvian) and Cyrillic (Russian) are still
 * served, fetched only by pages whose text needs them (unicode-range). Preloading every subset of both
 * faces meant ~280 KB ahead of the first paint on every visit (Lighthouse mobile, plan 12).
 */
export const displayFont = Sofia_Sans_Extra_Condensed({
  subsets: ['latin'], // preloaded; latin-ext and cyrillic are still served (see above)
  weight: ['800', '900'],
  variable: '--font-display-face',
  display: 'swap',
});

export const bodyFont = Onest({
  subsets: ['latin'], // preloaded; latin-ext and cyrillic are still served (see above)
  weight: ['400', '500', '600', '700'],
  variable: '--font-body-face',
  display: 'swap',
});

/** Class names that define both font variables on <html>. */
export const fontVariables = `${displayFont.variable} ${bodyFont.variable}`;
