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

  test.describe(`FAQ in ${locale}`, () => {
    test('every question is on the page and in the FAQPage data, in this language', async ({ page }) => {
      await page.goto(`${prefix}/faq`);
      await expect(page.getByRole('heading', { level: 1, name: m.faq.title })).toBeVisible();
      const questions = Object.values(m.faq.groups).flatMap((group) => Object.values(group.items));
      await expect(page.locator('main details')).toHaveCount(questions.length);

      const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
      expect(data['@type']).toBe('FAQPage');
      expect(data.mainEntity).toHaveLength(questions.length);
      expect(data.mainEntity.map((entry: { name: string }) => entry.name)).toEqual(questions.map((item) => item.q));
      expect(data.mainEntity[0].acceptedAnswer.text).toBe(questions[0]!.a);
      expect(data.url).toBe(`https://yoyo.rent${prefix}/faq`);
    });
  });
}

test('a FAQ answer opens from the keyboard, and a link to a question opens it', async ({ page }) => {
  await page.goto('/faq#deposit');
  await expect(page.locator('details#deposit')).toHaveAttribute('open', '');
  await expect(page.getByText(en.faq.groups.money.items.deposit.a)).toBeVisible();

  const summary = page.locator('details#who > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(en.faq.groups.renting.items.who.a)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText(en.faq.groups.renting.items.who.a)).toBeHidden();
});

test('the landing page answers four common questions and leads to the rest', async ({ page }) => {
  await page.goto('/');
  const faq = page.locator('#faq');
  await expect(faq.locator('details')).toHaveCount(4);
  await expect(faq.getByRole('link', { name: en.landing.faq.all })).toHaveAttribute('href', '/faq');
});
