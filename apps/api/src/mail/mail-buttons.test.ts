import { createElement, type ReactElement } from 'react';
import { render } from 'react-email';
import { describe, expect, it } from 'vitest';
import { DealEvent } from './templates/DealEvent';
import { ListingApproved } from './templates/ListingApproved';
import { ListingRejected } from './templates/ListingRejected';
import { PhoneCode } from './templates/PhoneCode';
import { ResetPassword } from './templates/ResetPassword';
import { textsFor, type MailTexts } from './templates/texts';
import { VerifyEmail } from './templates/VerifyEmail';

/*
 * The call-to-action button of every email must be readable wherever it is opened (owner's report:
 * the Russian reset email in iOS Mail dark mode showed an empty outlined pill). So the button is
 * "bulletproof": its cell and its link both carry their own background and text colours, the label
 * never inherits a colour, the email declares that it supports light and dark, a dark block gives the
 * button its own dark colours, Outlook gets a VML pill, and the plain link stays below it.
 */

const LINK = 'https://yoyo.test/ru/reset-password?token=abc&next=%2Fsettings';
const LOCALES = ['en', 'lv', 'ru'] as const;

type Template = {
  name: string;
  button: (t: MailTexts) => string;
  element: (t: MailTexts, lang: string) => ReactElement;
};

const TEMPLATES: Template[] = [
  {
    name: 'verify email',
    button: (t) => t.verifyEmail.button,
    element: (t, lang) => createElement(VerifyEmail, { t, lang, name: 'Anna', link: LINK }),
  },
  {
    name: 'reset password',
    button: (t) => t.resetPassword.button,
    element: (t, lang) => createElement(ResetPassword, { t, lang, name: 'Anna', link: LINK }),
  },
  {
    name: 'listing approved',
    button: (t) => t.listingApproved.button,
    element: (t, lang) =>
      createElement(ListingApproved, { t, lang, name: 'Anna', title: 'Drill <b>', link: LINK }),
  },
  {
    name: 'listing rejected',
    button: (t) => t.listingRejected.button,
    element: (t, lang) =>
      createElement(ListingRejected, {
        t,
        lang,
        name: 'Anna',
        title: 'Drill',
        reason: 'Blurry photos',
        link: LINK,
      }),
  },
  ...(['button', 'offerButton'] as const).map((button) => ({
    name: `deal event (${button})`,
    button: (t: MailTexts) => t.deal.common[button],
    element: (t: MailTexts, lang: string) =>
      createElement(DealEvent, {
        t,
        lang,
        name: 'Anna',
        texts: t.deal.REQUESTED.owner,
        values: {
          title: 'Drill',
          start: '1',
          end: '2',
          total: '€10',
          rent: '€8',
          deposit: '€2',
          other: 'Jānis',
          price: '€8',
        },
        summary: { item: 'Drill', dates: '1 – 2', total: '€10' },
        button: t.deal.common[button],
        link: LINK,
      }),
  })),
];

const html = (template: Template, locale: string) => {
  const { t } = textsFor(locale);
  return render(template.element(t, locale));
};

// --- a small reader for the rendered HTML and its <style> -----------------------------------------

/** The opening tags carrying `className` (one class among others is enough). */
function tagsWithClass(source: string, className: string): string[] {
  return [...source.matchAll(/<[a-z:]+\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .filter((tag) => (/\bclass="([^"]*)"/.exec(tag)?.[1] ?? '').split(/\s+/).includes(className));
}

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];
}

/** Inline style of a tag as { property: value }, lower case, without !important. */
function inlineStyle(tag: string): Record<string, string> {
  const style = attribute(tag, 'style') ?? '';
  return Object.fromEntries(
    style
      .split(';')
      .map((declaration) => declaration.split(/:(.*)/s).map((part) => part.trim().toLowerCase()))
      .filter(([property, value]) => property && value)
      .map(([property, value]) => [property!, value!.replace(/\s*!important$/, '')]),
  );
}

/** Rules of the `@media (prefers-color-scheme: dark)` block, as { '.class': { property: value } }. */
function darkRules(source: string): Record<string, Record<string, string>> {
  const css = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(([, body]) => body).join('\n');
  const start = css.search(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/);
  expect(start, 'a prefers-color-scheme: dark block').toBeGreaterThanOrEqual(0);
  // The block body: from its "{" to the matching "}".
  let depth = 0;
  let body = '';
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    const char = css[i]!;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) break;
    if (i > css.indexOf('{', start)) body += char;
  }
  return rulesOf(body);
}

function rulesOf(css: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {};
  for (const [, selectors, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const style = inlineStyle(`<x style="${declarations!.replace(/"/g, "'")}">`);
    for (const selector of selectors!.split(',').map((s) => s.trim())) {
      rules[selector] = { ...rules[selector], ...style };
    }
  }
  return rules;
}

function rulesWithImportant(source: string): string {
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(([, body]) => body).join('\n');
}

// --- colour maths (WCAG 2.x) -------------------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`not a #rrggbb colour: ${hex}`);
  const value = parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const hex = (rgbValue: number[]) =>
  `#${rgbValue.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/**
 * Gmail iOS dark mode: every colour is inverted, lightness flipped and hue kept. Adding the same
 * amount to the three channels flips the HSL lightness (max + min)/2 and keeps hue and saturation.
 */
const fullInversion = (color: string) => {
  const channels = rgb(color);
  const shift = 255 - Math.max(...channels) - Math.min(...channels);
  return hex(channels.map((c) => c + shift));
};

/**
 * Gmail Android / Outlook "partial" dark mode: only light backgrounds get darker and only dark text
 * gets lighter; colours already in the dark scheme are left as they are.
 */
const partialInversion = {
  background: (color: string) => (luminance(color) > 0.4 ? fullInversion(color) : color),
  text: (color: string) => (luminance(color) < 0.2 ? fullInversion(color) : color),
};

// --- the button itself --------------------------------------------------------------------------------

interface Button {
  cell: Record<string, string>;
  cellBgcolor: string | undefined;
  link: Record<string, string>;
  label: Record<string, string>;
}

function lightButton(source: string): Button {
  const [cell] = tagsWithClass(source, 'yoyo-cta-cell');
  const [link] = tagsWithClass(source, 'yoyo-cta');
  const [label] = tagsWithClass(source, 'yoyo-cta-label');
  expect(cell, 'the button cell').toBeDefined();
  expect(link, 'the button link').toBeDefined();
  expect(label, 'the button label').toBeDefined();
  return {
    cell: inlineStyle(cell!),
    cellBgcolor: attribute(cell!, 'bgcolor'),
    link: inlineStyle(link!),
    label: inlineStyle(label!),
  };
}

describe('every email call-to-action is a bulletproof button', () => {
  for (const template of TEMPLATES) {
    for (const locale of LOCALES) {
      describe(`${template.name}, ${locale}`, () => {
        it('says it supports light and dark, so Apple Mail uses its colours instead of guessing', async () => {
          const source = await html(template, locale);
          expect(source).toMatch(/<meta[^>]+name="color-scheme"[^>]+content="light dark"/);
          expect(source).toMatch(/<meta[^>]+name="supported-color-schemes"[^>]+content="light dark"/);
          expect(rulesWithImportant(source)).toMatch(/color-scheme:\s*light dark/);
        });

        it('gives the cell, the link and the label explicit colours in light, at least 4.5:1', async () => {
          const source = await html(template, locale);
          const { cell, cellBgcolor, link, label } = lightButton(source);
          expect(cellBgcolor).toMatch(/^#[0-9a-f]{6}$/i);
          expect(cell['background-color']).toBe(cellBgcolor!.toLowerCase());
          expect(link['background-color']).toBe(cell['background-color']);
          expect(link['color']).toMatch(/^#[0-9a-f]{6}$/);
          // The label has its own colour: it never inherits one a mail client may have rewritten.
          expect(label['color']).toBe(link['color']);
          expect(contrast(label['color']!, link['background-color']!)).toBeGreaterThanOrEqual(4.5);
        });

        it('gives the cell, the link and the label explicit colours in dark, at least 4.5:1', async () => {
          const source = await html(template, locale);
          const dark = darkRules(source);
          const cell = dark['.yoyo-cta-cell'];
          const link = dark['.yoyo-cta'];
          const label = dark['.yoyo-cta-label'];
          expect(cell?.['background-color']).toMatch(/^#[0-9a-f]{6}$/);
          expect(link?.['background-color']).toBe(cell!['background-color']);
          expect(link?.['color']).toMatch(/^#[0-9a-f]{6}$/);
          expect(label?.['color']).toBe(link!['color']);
          expect(contrast(label!['color']!, link!['background-color']!)).toBeGreaterThanOrEqual(4.5);
          // Dark overrides must win over the inline light colours.
          const css = rulesWithImportant(source);
          for (const selector of ['.yoyo-cta-cell', '.yoyo-cta', '.yoyo-cta-label']) {
            expect(css).toMatch(new RegExp(`\\${selector}\\b[^{]*\\{[^}]*!important`));
          }
        });

        it('stays readable when Gmail inverts the colours (full and partial dark mode)', async () => {
          const { link, label } = lightButton(await html(template, locale));
          const background = link['background-color']!;
          const text = label['color']!;
          expect(contrast(fullInversion(text), fullInversion(background))).toBeGreaterThanOrEqual(4.5);
          expect(
            contrast(partialInversion.text(text), partialInversion.background(background)),
          ).toBeGreaterThanOrEqual(4.5);
        });

        it('shows the label and the link, with a VML pill for Outlook and the plain link below', async () => {
          const source = await html(template, locale);
          const { t } = textsFor(locale);
          const label = template.button(t);
          const escapedLink = LINK.replaceAll('&', '&amp;');
          expect(source).toContain(`>${label}</span>`);
          expect(attribute(tagsWithClass(source, 'yoyo-cta')[0]!, 'href')).toBe(escapedLink);
          const mso = /<!--\[if mso\]>([\s\S]*?)<!\[endif\]-->/.exec(source)?.[1] ?? '';
          expect(mso).toMatch(/<v:roundrect[^>]+href="[^"]+"[^>]+fillcolor="#[0-9a-f]{6}"/i);
          expect(mso).toMatch(/<center[^>]+style="[^"]*color:\s*#[0-9a-f]{6}/i);
          expect(mso).toContain(label);
          // The plain link under the button, for clients that block it.
          const plainLinks = tagsWithClass(source, 'yoyo-link').filter(
            (tag) => attribute(tag, 'href') === escapedLink,
          );
          expect(plainLinks).toHaveLength(1);
        });

        it('keeps the Yoyo pill: 1px ink outline, fully round, display font with system fallbacks', async () => {
          const { cell, link } = lightButton(await html(template, locale));
          expect(cell['border']).toMatch(/^1px solid #[0-9a-f]{6}$/);
          expect(cell['border-radius']).toBe('9999px');
          expect(link['border-radius']).toBe('9999px');
          expect(link['font-family']).toMatch(/^'sofia sans extra condensed',.*sans-serif$/);
        });

        it('gives every coloured element of the email a dark colour too (no dark text on a dark card)', async () => {
          const full = await html(template, locale);
          const dark = darkRules(full);
          // Outlook for Windows reads only its conditional VML and has no prefers-color-scheme.
          const source = full.replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/g, '');
          const coloured = [
            ...source.matchAll(
              /<(?!meta|html|head|title|style|!)[a-z:]+\b[^>]*\bstyle="[^"]*\b(?:color|background-color):[^>]*>/gi,
            ),
          ]
            .map(([tag]) => tag)
            .filter((tag) => !/display:\s*none/.test(tag)); // the hidden preview text
          expect(coloured.length).toBeGreaterThan(5);
          for (const tag of coloured) {
            const classes = (attribute(tag, 'class') ?? '').split(/\s+/).filter(Boolean);
            const overridden = classes.some((name) => dark[`.${name}`]);
            expect(overridden, `dark colours for ${tag.slice(0, 120)}`).toBe(true);
          }
        });
      });
    }
  }

  it('the phone code email (no button) is dark-ready as well', async () => {
    const { t } = textsFor('ru');
    const source = await render(createElement(PhoneCode, { t, lang: 'ru', name: 'Анна', code: '123456' }));
    expect(source).toMatch(/<meta[^>]+name="color-scheme"[^>]+content="light dark"/);
    expect(darkRules(source)['.yoyo-text']?.['color']).toBe('#f4f1e6')   // v16 dark ink: cream;
  });
});
