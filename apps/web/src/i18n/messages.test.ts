import { LOCALES, RULE_PRESETS, type Locale } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import lv from '../../messages/lv.json';
import ru from '../../messages/ru.json';

type Tree = { [key: string]: string | Tree };
const messages: Record<Locale, Tree> = { en, lv, ru };

/** Every leaf key as a dotted path, sorted. */
function flatKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'string' ? [`${prefix}${key}`] : flatKeys(value, `${prefix}${key}.`),
    )
    .sort();
}

/** Dotted paths of leaves that are empty or whitespace only. */
function emptyValues(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? [`${prefix}${key}`]
        : []
      : emptyValues(value, `${prefix}${key}.`),
  );
}

describe('interface messages', () => {
  it.each(['lv', 'ru'] as const)('%s has exactly the same keys as English', (locale) => {
    expect(flatKeys(messages[locale])).toEqual(flatKeys(messages.en));
  });

  it('labels every listing rule preset', () => {
    expect(Object.keys(messages.en['listingRules'] as Tree).sort()).toEqual([...RULE_PRESETS].sort());
  });

  it.each(LOCALES)('%s has no empty strings', (locale) => {
    expect(emptyValues(messages[locale])).toEqual([]);
  });

  it.each(LOCALES)('%s names each language in that language itself', (locale) => {
    expect(messages[locale]['language']).toMatchObject({ en: 'English', lv: 'Latviešu', ru: 'Русский' });
  });
});
