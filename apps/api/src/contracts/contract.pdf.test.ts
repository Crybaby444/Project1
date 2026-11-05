import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { CONTRACT_TEXTS } from './contract-texts';
import { FONT_FILES, loadFonts, renderContract, type ContractInput } from './contract.pdf';

const terms: ContractInput['terms'] = {
  contractId: 'b1',
  acceptedAt: '2027-03-01T09:00:00.000Z',
  renter: { id: 'r', name: 'Žanis Āboliņš', email: 'zanis@mail.lv' },
  owner: { id: 'o', name: 'Мария Щукина', email: 'maria@mail.ru' },
  listing: {
    id: 'l',
    title: 'Bosch urbjmašīna ar diviem akumulatoriem',
    condition: 'GOOD',
    city: 'Rīga',
    district: 'Centrs',
    rules: { preset: ['ID_AT_PICKUP', 'NO_SMOKING'], custom: ['Ļoti garš noteikums bez atstarpēm: ' + 'ā'.repeat(90)] },
  },
  period: { start: '2027-03-02', end: '2027-03-09' },
  timeZone: 'Europe/Riga',
  quote: {
    days: 8,
    dailyCents: 1500,
    baseCents: 12_000,
    discountPercent: 10,
    discountCents: 1_200,
    rentCents: 10_800,
    serviceFeeCents: 1_080,
    depositCents: 5_000,
    totalCents: 16_880,
    ownerPayoutCents: 10_800,
    priceSource: 'LISTED',
  },
  deadlines: { handoverConfirmHours: 48, returnConfirmHours: 48, inspectionHours: 48, damageReplyHours: 48 },
};

const input = (locale: 'en' | 'lv' | 'ru'): ContractInput => ({
  terms,
  termsHash: 'a'.repeat(64),
  renterSignedAt: new Date('2027-03-01T10:00:00Z'),
  ownerSignedAt: null,
  locale,
  now: new Date('2027-03-01T12:00:00Z'),
});

describe('renderContract', () => {
  it.each([
    ['en', 'Rental agreement'],
    ['lv', 'Nomas līgums'],
    ['ru', 'Договор аренды'],
  ] as const)('draws the contract in %s', async (locale, title) => {
    const pdf = await renderContract(input(locale));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const doc = await PDFDocument.load(pdf);
    expect(doc.getTitle()).toBe(`${title} b1`);
    expect(doc.getSubject()).toBe('Bosch urbjmašīna ar diviem akumulatoriem');
    expect(String(doc.catalog.get(PDFName.of('Lang')))).toBe(`(${locale})`);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('has a glyph for every character of every text and of the sample data', async () => {
    const fonts = await loadFonts();
    const all = [JSON.stringify(CONTRACT_TEXTS), JSON.stringify(terms), '€ № – —'].join('');
    for (const file of FONT_FILES) {
      const font = fontkit.create(fonts[file]);
      const missing = [...new Set(all)].filter((ch) => ch.trim() !== '' && !font.hasGlyphForCodePoint(ch.codePointAt(0)!));
      expect({ file, missing }).toEqual({ file, missing: [] });
    }
  });
});
