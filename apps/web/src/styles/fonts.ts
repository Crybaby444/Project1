/**
 * The single place where fonts are wired. Swapping the free substitutes for the licensed
 * Lateral / Aeonik Pro (DESIGN.md, Project adaptations §5) is a change to this file only.
 * Both faces cover Latin Extended (ā č ē ģ ī ķ ļ ņ š ū ž) and Cyrillic.
 */
import { Onest, Unbounded } from 'next/font/google';

export const displayFont = Unbounded({
  weight: ['800', '900'],
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-yoyo-display',
  display: 'swap',
});

export const bodyFont = Onest({
  weight: ['500', '700'],
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-yoyo-body',
  display: 'swap',
});

export const fontVariables = `${displayFont.variable} ${bodyFont.variable}`;
