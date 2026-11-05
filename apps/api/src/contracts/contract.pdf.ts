import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { cents, formatMoney } from '@yoyo/domain';
import type { Locale } from '@yoyo/shared';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ContractTerms } from '../bookings/effects.executor';
import { formatDay } from '../common/format';
import { CONTRACT_TEXTS } from './contract-texts';

/** Liberation Sans (SIL OFL 1.1, assets/fonts/LICENSE.txt): Latvian letters and Cyrillic included. */
export const FONT_FILES = ['LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf'] as const;

/** `assets/` sits next to `src/` and `dist/`, so the same path works in tests and in the image. */
const FONT_DIR = join(__dirname, '..', '..', 'assets', 'fonts');

let fontCache: Promise<Record<(typeof FONT_FILES)[number], Buffer>> | undefined;

export function loadFonts(): Promise<Record<(typeof FONT_FILES)[number], Buffer>> {
  fontCache ??= Promise.all(FONT_FILES.map((file) => readFile(join(FONT_DIR, file)))).then(
    ([regular, bold]) => ({ 'LiberationSans-Regular.ttf': regular!, 'LiberationSans-Bold.ttf': bold! }),
  );
  return fontCache;
}

export interface ContractInput {
  terms: ContractTerms;
  termsHash: string;
  renterSignedAt: Date | null;
  ownerSignedAt: Date | null;
  locale: Locale;
  /** When the PDF is drawn (printed at the bottom). */
  now: Date;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const WIDTH = A4.width - 2 * MARGIN;
const INK = rgb(0, 0, 0);
const MUTED = rgb(0.35, 0.35, 0.35);

/** Splits `text` into lines no wider than `width`; a word wider than a line is cut by characters. */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  const fits = (candidate: string) => font.widthOfTextAtSize(candidate, size) <= width;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line !== '') lines.push(line);
    let rest = word;
    while (!fits(rest)) {
      let cut = rest.length - 1;
      while (cut > 1 && !fits(rest.slice(0, cut))) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line !== '') lines.push(line);
  return lines.length > 0 ? lines : [''];
}

/** Draws text top-down, starting a new page when the current one is full. */
class Writer {
  private page: PDFPage;
  private y: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = doc.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN;
  }

  private room(height: number): void {
    if (this.y - height >= MARGIN) return;
    this.page = this.doc.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN;
  }

  text(text: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; after?: number } = {}): void {
    const size = options.size ?? 10;
    const font = options.bold ? this.bold : this.regular;
    const indent = options.indent ?? 0;
    for (const line of wrap(text, font, size, WIDTH - indent)) {
      this.room(size * 1.4);
      this.page.drawText(line, { x: MARGIN + indent, y: this.y - size, size, font, color: options.color ?? INK });
      this.y -= size * 1.4;
    }
    this.y -= options.after ?? 0;
  }

  /** A label on the left and its value on the right, on one line. */
  row(label: string, value: string, bold = false): void {
    const size = 10;
    const font = bold ? this.bold : this.regular;
    this.room(size * 1.5);
    this.page.drawText(label, { x: MARGIN + 8, y: this.y - size, size, font, color: INK });
    const width = font.widthOfTextAtSize(value, size);
    this.page.drawText(value, { x: MARGIN + WIDTH - width, y: this.y - size, size, font, color: INK });
    this.y -= size * 1.5;
  }

  heading(text: string): void {
    this.y -= 8;
    this.text(text, { size: 12, bold: true, after: 2 });
  }

  gap(points: number): void {
    this.y -= points;
  }
}

/**
 * The rental contract (spec §4.4 step 3) as a PDF in `locale`, from the terms frozen when the owner
 * accepted. The same terms give the same contract in every language; their fingerprint is printed.
 */
export async function renderContract(input: ContractInput): Promise<Buffer> {
  const { terms, locale } = input;
  const t = CONTRACT_TEXTS[locale];
  const fonts = await loadFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts['LiberationSans-Regular.ttf'], { subset: true });
  const bold = await doc.embedFont(fonts['LiberationSans-Bold.ttf'], { subset: true });
  doc.setTitle(`${t.title} ${terms.contractId}`);
  doc.setSubject(terms.listing.title);
  doc.setLanguage(locale);
  doc.setAuthor('Yoyo');
  doc.setCreator('Yoyo');
  doc.setProducer('Yoyo');
  doc.setCreationDate(input.now);
  doc.setModificationDate(input.now);

  const money = (amount: number) => formatMoney(cents(amount), locale);
  const numeric = locale === 'lv';
  const momentStyle: Intl.DateTimeFormatOptions = numeric
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { dateStyle: 'long', timeStyle: 'short' };
  const day = (value: string) => formatDay(value, locale);
  const moment = (value: Date | string) => new Intl.DateTimeFormat(locale, { ...momentStyle, timeZone: terms.timeZone }).format(new Date(value));
  const hours = {
    inspection: terms.deadlines.inspectionHours,
    reply: terms.deadlines.damageReplyHours,
    handover: terms.deadlines.handoverConfirmHours,
    return: terms.deadlines.returnConfirmHours,
  };

  const w = new Writer(doc, regular, bold);
  w.text('YOYO', { size: 20, bold: true, after: 6 });
  w.text(t.title, { size: 18, bold: true, after: 2 });
  w.text(fill(t.number, { id: terms.contractId, date: moment(terms.acceptedAt) }), { color: MUTED, after: 8 });
  w.text(t.intro, { after: 4 });

  w.heading(t.parties);
  w.text(`${t.owner}: ${terms.owner.name}, ${terms.owner.email}`, { indent: 8 });
  w.text(`${t.renter}: ${terms.renter.name}, ${terms.renter.email}`, { indent: 8 });

  w.heading(t.item);
  w.text(terms.listing.title, { bold: true, indent: 8 });
  if (terms.listing.condition) w.text(`${t.condition}: ${t.conditions[terms.listing.condition]}`, { indent: 8 });
  const place = [terms.listing.district, terms.listing.city].filter(Boolean).join(', ');
  if (place) w.text(`${t.place}: ${place}`, { indent: 8 });

  w.heading(t.period);
  w.text(fill(t.periodLine, { start: day(terms.period.start), end: day(terms.period.end) }), { indent: 8 });
  w.text(`${fill(t.days, { days: terms.quote.days })}. ${fill(t.timeZone, { zone: terms.timeZone })}`, { indent: 8, color: MUTED });

  w.heading(t.price);
  const q = terms.quote;
  w.row(t.daily, money(q.dailyCents));
  w.row(t.base, money(q.baseCents));
  if (q.discountCents > 0) w.row(fill(t.discount, { percent: q.discountPercent }), `−${money(q.discountCents)}`);
  w.row(t.rent, money(q.rentCents));
  w.row(t.fee, money(q.serviceFeeCents));
  w.row(t.deposit, money(q.depositCents));
  w.row(t.total, money(q.totalCents), true);
  w.gap(2);
  w.text(fill(t.ownerGets, { rent: money(q.ownerPayoutCents) }), { indent: 8, color: MUTED });
  if (q.priceSource === 'AGREED') w.text(t.agreedPrice, { indent: 8, color: MUTED });

  w.heading(t.depositRules);
  for (const paragraph of t.depositText) w.text(fill(paragraph, hours), { indent: 8, after: 3 });
  w.heading(t.handover);
  for (const paragraph of t.handoverText) w.text(fill(paragraph, hours), { indent: 8, after: 3 });
  w.heading(t.cancellation);
  for (const paragraph of t.cancellationText) w.text(paragraph, { indent: 8, after: 3 });

  w.heading(t.rules);
  const rules = [
    ...terms.listing.rules.preset.map((preset) => t.presets[preset as keyof typeof t.presets] ?? preset),
    ...terms.listing.rules.custom,
  ];
  if (rules.length === 0) w.text(t.noRules, { indent: 8 });
  for (const rule of rules) w.text(`• ${rule}`, { indent: 8 });

  w.heading(t.signatures);
  const signed = (at: Date | null) => (at === null ? t.notSigned : fill(t.signedAt, { date: moment(at) }));
  w.text(`${t.owner}: ${terms.owner.name} — ${signed(input.ownerSignedAt)}`, { indent: 8 });
  w.text(`${t.renter}: ${terms.renter.name} — ${signed(input.renterSignedAt)}`, { indent: 8 });

  w.gap(16);
  w.text(fill(t.hash, { hash: input.termsHash }), { size: 8, color: MUTED });
  w.text(fill(t.generated, { date: moment(input.now) }), { size: 8, color: MUTED });

  return Buffer.from(await doc.save());
}
