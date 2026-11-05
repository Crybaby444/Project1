import { LOCALES, SESSION_HINT_COOKIE, THEME_COOKIE, type Locale } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { SERVICE_FACTS } from '@/lib/site';
import { COOKIES_POLICY } from './cookies';
import { describeOperator } from './operator';
import { PRIVACY_POLICY } from './privacy';
import { TERMS } from './terms';
import type { Block, LegalDoc, LegalTexts } from './types';

const DOCS: Record<string, LegalTexts> = { terms: TERMS, privacy: PRIVACY_POLICY, cookies: COOKIES_POLICY };

const kind = (block: Block) => ('p' in block ? 'p' : 'list' in block ? `list:${block.list.length}` : `table:${block.table.rows.length}x${block.table.head.length}`);

/** The shape of a document: section ids in order, and the kind and size of every block. */
const shape = (doc: LegalDoc) => ({
  summary: doc.summary.length,
  sections: doc.sections.map((section) => [section.id, section.blocks.map(kind)]),
});

const allText = (doc: LegalDoc) =>
  [
    doc.title,
    ...doc.summary,
    ...doc.sections.flatMap((section) => [
      section.heading,
      ...section.blocks.flatMap((block) =>
        'p' in block ? [block.p] : 'list' in block ? block.list : [...block.table.head, ...block.table.rows.flat()],
      ),
    ]),
  ].join('\n');

describe.each(Object.entries(DOCS))('%s', (_name, texts) => {
  it.each(['lv', 'ru'] as const)('%s has the same sections and blocks as English', (locale) => {
    expect(shape(texts[locale])).toEqual(shape(texts.en));
  });

  it.each(LOCALES)('%s has unique section ids, no placeholders left over and no unfinished text', (locale) => {
    const doc = texts[locale];
    const ids = doc.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    const text = allText(doc).replaceAll('{operator}', '');
    expect(text).not.toMatch(/[{}]|lorem|TODO|TBD|XXX/i);
  });

  it.each(LOCALES)('%s gives the contact address', (locale) => {
    expect(allText(texts[locale])).toContain('admin@yoyo.rent');
  });
});

describe('privacy policy', () => {
  it.each(LOCALES)('%s names every provider that handles data', (locale) => {
    const text = allText(PRIVACY_POLICY[locale]);
    for (const name of ['Vercel', 'Render', 'Neon', 'Resend', 'Cloudinary', 'ImprovMX', 'GoDaddy', 'Google', 'Nominatim']) {
      expect(text, name).toContain(name);
    }
  });

  it.each(LOCALES)('%s says which data is needed for an account and what happens without it (GDPR Art. 13(2)(e))', (locale) => {
    const ids = PRIVACY_POLICY[locale].sections.map((section) => section.id);
    expect(ids).toContain('required');
    expect(ids.indexOf('required')).toBe(ids.indexOf('purposes') + 1);
  });

  it.each([
    ['en', /open deal.*wallet/s],
    ['lv', /darījum.*mak/s],
    ['ru', /сделк.*кошел/s],
  ] as const)('%s says an open deal or a wallet balance must be settled before deleting (API: 409)', (locale, pattern) => {
    const section = PRIVACY_POLICY[locale].sections.find((s) => s.id === 'delete')!;
    const text = section.blocks.map((b) => ('p' in b ? b.p : '')).join(' ');
    expect(text).toMatch(pattern);
  });

  it.each(LOCALES)('%s says how to complain and how to delete the account', (locale: Locale) => {
    const text = allText(PRIVACY_POLICY[locale]);
    expect(text).toContain('dvi.gov.lv');
    expect(text).toMatch(/Elijas iel[aā] 17/); // Latvian says “Elijas ielā 17” in a sentence
    expect(PRIVACY_POLICY[locale].sections.map((section) => section.id)).toContain('delete');
  });
});

describe('cookie policy', () => {
  const NAMES = ['yoyo_at', 'yoyo_rt', SESSION_HINT_COOKIE, 'yoyo_dev', 'yoyo_oauth', THEME_COOKIE, 'NEXT_LOCALE'];

  it.each(LOCALES)('%s lists exactly the cookies the site and the API set', (locale) => {
    const table = COOKIES_POLICY[locale].sections.find((section) => section.id === 'list')!.blocks.find((b) => 'table' in b);
    const names = table && 'table' in table ? table.table.rows.map((row) => row[0]) : [];
    expect(names).toEqual(NAMES);
  });

  it.each(LOCALES)('%s mentions the one thing kept in local storage', (locale) => {
    expect(allText(COOKIES_POLICY[locale])).toContain('yoyo-refreshed-at');
  });
});

describe('terms of service', () => {
  it.each(LOCALES)('%s quotes the same fee, deadlines and review window as the rest of the site', (locale) => {
    const text = allText(TERMS[locale]);
    expect(text).toContain(`${SERVICE_FACTS.serviceFeePercent}%`);
    expect(text).toContain(String(SERVICE_FACTS.requestHours));
    expect(text).toContain(String(SERVICE_FACTS.checkHours));
    expect(text).toContain(String(SERVICE_FACTS.reviewDays));
    expect(text).toContain('ptac.gov.lv');
  });
});

describe('describeOperator', () => {
  it('describes the operator without details until the owner gives them', () => {
    expect(describeOperator('en')).toBe('the operator of Yoyo, based in Latvia');
  });

  it('names the company with its number and address once they are filled in', () => {
    const operator = {
      brand: 'Yoyo',
      country: 'Latvia',
      email: 'admin@yoyo.rent',
      legalName: 'SIA Piemērs',
      registrationNumber: '40000000000',
      address: 'Brīvības iela 1, Rīga',
    };
    expect(describeOperator('lv', operator)).toBe('SIA Piemērs, reģ. Nr. 40000000000, Brīvības iela 1, Rīga');
  });
});
