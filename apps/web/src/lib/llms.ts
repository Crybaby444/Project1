import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { localizedUrl } from './seo';

const PAGES = [
  ['/what-is-yoyo', 'What is Yoyo', 'the idea, both sides of a deal step by step, the deposit rule and everything the platform does'],
  ['/faq', 'Questions and answers', 'money, the deposit, safety, accounts and data'],
  ['/c', 'Catalog', 'every category'],
  ['/terms', 'Terms of service', ''],
  ['/privacy', 'Privacy policy', ''],
] as const;

const LANGUAGES = [
  ['en', 'English'],
  ['lv', 'Latviešu'],
  ['ru', 'Русский'],
] as const;

/**
 * llms.txt (llmstxt.org): a short Markdown map of the site for AI assistants and AI search — what Yoyo
 * is, the rules every deal keeps (from the booking settings, not typed copy), and where to read more.
 */
export function llmsText(origin: string, categories: { name: string; url: string }[]): string {
  const hours = DEFAULT_BOOKING_SETTINGS.inspectionHours;
  const lines = [
    '# Yoyo',
    '',
    '> Yoyo (yoyo.rent) is a marketplace where people rent things from other people nearby, for a day or a week, and lend out what they rarely use. It works in Riga and the Baltics, in English, Latvian and Russian.',
    '',
    '## How a deal works',
    '',
    '- The renter finds an item by name, district and dates and asks for the days; the full price, the service fee and the deposit are shown before sending.',
    '- When the owner accepts, both sign a contract online (written for EU law): the renter first, then the owner. Nothing is paid before both signatures.',
    '- The renter pays through Yoyo; the deposit is held during the deal. They meet in person and add photos of the item to the deal’s own chat.',
    `- After the return the owner has ${hours} hours to check the item; then the deposit goes back to the renter by itself. A damage claim is made from the deposit with photos, and Yoyo decides if the two disagree.`,
    '- Every listing is checked by a person before it goes live. Reviews come only from finished deals. People have public profiles, followers and shops (collections of their things).',
    '',
    '## Pages',
    '',
    ...LANGUAGES.flatMap(([locale, language]) => [
      `### ${language}`,
      '',
      ...PAGES.map(([path, title, note]) => `- [${title}](${localizedUrl(path, locale, origin)})${note ? `: ${note}` : ''}`),
      '',
    ]),
    '## Catalog',
    '',
    ...categories.map((c) => `- [${c.name}](${c.url})`),
    '',
    '## Optional',
    '',
    `- [Sitemap](${origin}/sitemap.xml): every page, category and item`,
    '',
  ];
  return lines.join('\n');
}
