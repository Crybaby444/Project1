import { createElement } from 'react';
import { render } from 'react-email';
import { describe, expect, it } from 'vitest';
import { textsFor } from './texts';
import { VerifyEmail } from './VerifyEmail';

/** Emails look like the v16 site (owner, 2026-11-14): cream paper, night ink, condensed display type, no blue. */
describe('v16 email look', () => {
  it('uses the cream paper and the night ink, and none of the old sky blue', async () => {
    const html = await render(createElement(VerifyEmail, { t: textsFor('en').t, lang: 'en', name: 'Anna', link: 'https://yoyo.test/x' }));
    expect(html).toMatch(/#f4f1e6/i);
    expect(html).toMatch(/#0a0b0e/i);
    expect(html).not.toMatch(/#dceeff|#4da2ff|#9ed2ff/i);
  });

  it('sets the title in the condensed display face, upper-case, like the site', async () => {
    const html = await render(createElement(VerifyEmail, { t: textsFor('ru').t, lang: 'ru', name: 'Анна', link: 'https://yoyo.test/x' }));
    const h1 = /<h1[^>]*style="([^"]*)"/.exec(html)![1]!;
    expect(h1).toMatch(/Sofia Sans Extra Condensed/);
    expect(h1).toMatch(/text-transform:\s*uppercase/);
    expect(html).not.toMatch(/Unbounded/);
  });
});
