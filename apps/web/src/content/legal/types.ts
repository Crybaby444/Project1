/*
 * Legal texts of the site (terms, privacy, cookies) as data, the same structure in every language.
 * Links inside text are written [text](/path), [text](mailto:…) or [text](https://…); `{operator}`
 * is replaced with who runs Yoyo (operator.ts).
 */
import type { Locale } from '@yoyo/shared';

export type Block = { p: string } | { list: string[] } | { table: { head: string[]; rows: string[][] } };

export type LegalSection = { id: string; heading: string; blocks: Block[] };

export type LegalDoc = {
  title: string;
  /** Short plain-language summary shown first; the sections are what counts. */
  summary: string[];
  sections: LegalSection[];
};

export type LegalTexts = Record<Locale, LegalDoc>;

/** The date the current versions take effect (ISO), shown at the top of each document. */
export const LEGAL_EFFECTIVE_DATE = '2026-11-05';
