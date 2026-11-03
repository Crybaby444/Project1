import { LOCALES } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import lv from '../../messages/lv.json';
import ru from '../../messages/ru.json';

type Tree = { [key: string]: string | Tree };

const messages: Record<string, Tree> = { en, lv, ru };

function flatKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'string' ? [`${prefix}${key}`] : flatKeys(value, `${prefix}${key}.`),
    )
    .sort();
}

function emptyValues(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? [`${prefix}${key}`]
        : []
      : emptyValues(value, `${prefix}${key}.`),
  );
}

describe('messages', () => {
  it.each(['lv', 'ru'])('%s has exactly the same keys as en', (locale) => {
    expect(flatKeys(messages[locale]!)).toEqual(flatKeys(messages.en!));
  });

  it.each([...LOCALES])('%s has no empty strings', (locale) => {
    expect(emptyValues(messages[locale]!)).toEqual([]);
  });

  it('labels every language in its own language', () => {
    for (const locale of LOCALES) {
      expect((messages[locale]!.language as Tree)).toMatchObject({ en: 'English', lv: 'Latviešu', ru: 'Русский' });
    }
  });
});
