import { expect, test } from '@playwright/test';
import en from '../messages/site/en.json' with { type: 'json' };
import lv from '../messages/site/lv.json' with { type: 'json' };
import ru from '../messages/site/ru.json' with { type: 'json' };

const LANGUAGES = [
  { locale: 'en', prefix: '', m: en },
  { locale: 'lv', prefix: '/lv', m: lv },
  { locale: 'ru', prefix: '/ru', m: ru },
] as const;

for (const { locale, prefix, m } of LANGUAGES) {
  test.describe(`service pages in ${locale}`, () => {
    test('how it works: the title, both sides, the deposit rule, and links that lead somewhere', async ({ page }) => {
      const response = await page.goto(`${prefix}/how-it-works`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { level: 1, name: m.howItWorks.title })).toBeVisible();
      for (const heading of [
        m.howItWorks.renter.heading,
        m.howItWorks.owner.heading,
        m.howItWorks.deposit.heading,
        m.howItWorks.cancel.heading,
        m.howItWorks.reviews.heading,
      ]) {
        await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
      }
      // The facts come from one place and are filled in, never left as {placeholders}.
      await expect(page.locator('main')).not.toContainText('{');
      await expect(page.locator('main')).toContainText('10%');
      await expect(page.getByRole('main').getByRole('link', { name: m.howItWorks.cta.faq })).toHaveAttribute(
        'href',
        `${prefix}/faq`,
      );
    });
  });
}
