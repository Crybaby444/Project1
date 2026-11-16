import { describe, expect, it } from 'vitest';
import { llmsText } from './llms';

describe('llms.txt', () => {
  const text = llmsText('https://yoyo.rent', [
    { name: 'Tools', url: 'https://yoyo.rent/c/tools' },
    { name: 'Camping', url: 'https://yoyo.rent/c/camping' },
  ]);

  it('opens with the name and a one-line summary, as the llms.txt format asks', () => {
    const [title, , summary] = text.split('\n');
    expect(title).toBe('# Yoyo');
    expect(summary).toMatch(/^> .*rent.*people/i);
  });

  it('links the pages that explain the platform, in every language, and the catalog by category', () => {
    for (const path of ['/what-is-yoyo', '/how-it-works', '/faq', '/terms', '/lv/what-is-yoyo', '/ru/faq']) {
      expect(text).toContain(`(https://yoyo.rent${path})`);
    }
    expect(text).toContain('- [Tools](https://yoyo.rent/c/tools)');
    expect(text).toContain('- [Camping](https://yoyo.rent/c/camping)');
  });

  it('states the rules a deal keeps, from the booking settings', () => {
    expect(text).toMatch(/contract/i);
    expect(text).toMatch(/deposit/i);
    expect(text).toContain('48 hours');
  });
});
