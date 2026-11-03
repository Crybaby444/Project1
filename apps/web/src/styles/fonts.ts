/**
 * The only place fonts are chosen. Swapping in licensed Lateral / Aeonik Pro later
 * means changing this file (e.g. to next/font/local) — nothing else.
 * Both faces cover Latin Extended (Latvian) and Cyrillic (Russian).
 */
import { Onest, Unbounded } from 'next/font/google';

export const displayFont = Unbounded({
  weight: ['800', '900'],
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-display-face',
  display: 'swap',
});

export const bodyFont = Onest({
  weight: ['500', '700'],
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-body-face',
  display: 'swap',
});

export const fontVariables = `${displayFont.variable} ${bodyFont.variable}`;
