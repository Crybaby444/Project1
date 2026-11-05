import { expect, test } from '@playwright/test';
import type { CategoryNode } from '@yoyo/shared';
import en from '../messages/site/en.json' with { type: 'json' };
import lv from '../messages/site/lv.json' with { type: 'json' };
import ru from '../messages/site/ru.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';

const LANGUAGES = [
  { locale: 'en', prefix: '', m: en },
  { locale: 'lv', prefix: '/lv', m: lv },
  { locale: 'ru', prefix: '/ru', m: ru },
] as const;

/** Section titles are upper-cased by CSS; their accessible name is the text as written. */
const sectionTitles = (m: typeof en) => [
  m.landing.what.title,
  m.landing.how.title,
  m.landing.safety.title,
  m.landing.categories.title,
  m.landing.final.title,
];

for (const { locale, prefix, m } of LANGUAGES) {
  test(`the landing page in ${locale}: one h1, every section, the real categories`, async ({ page, request }) => {
    const { categories } = (await (await request.get('/api/v1/categories')).json()) as { categories: CategoryNode[] };
    expect(categories.length).toBeGreaterThan(0);

    await page.goto(`${prefix}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeVisible();
    for (const title of sectionTitles(m)) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeAttached();
    }
    const grid = page.locator('#categories');
    for (const category of categories) {
      await expect(grid.getByRole('heading', { level: 3, name: category.names[locale] })).toBeAttached();
    }
    // The marquee says only true things, in the page language.
    await expect(page.getByText(m.landing.marquee.three).first()).toBeAttached();
  });
}

test('a guest is offered an account; the secondary action leads to how it works', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('section').first();
  await expect(hero.getByRole('link', { name: en.landing.ctaSignUp })).toHaveAttribute('href', '/register');
  await expect(hero.getByRole('link', { name: en.landing.ctaHowItWorks })).toHaveAttribute('href', '/how-it-works');
});

test('a signed-in person is not offered to sign up again', async ({ page, context }) => {
  await asOwnVisitor(context);
  await registerByApi(page.request);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Account menu/ })).toBeVisible();
  await expect(page.getByRole('link', { name: en.landing.ctaSignUp })).toHaveCount(0);
  await expect(page.locator('section').first().getByRole('link', { name: en.landing.ctaHowItWorks })).toBeVisible();
});

test('nothing is hidden until scrolled: every section is fully opaque at load', async ({ page }) => {
  await page.goto('/');
  const opacities = await page
    .locator('.reveal')
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity));
  expect(opacities.length).toBeGreaterThan(4);
  expect(new Set(opacities)).toEqual(new Set(['1']));
});

test('stickers wobble under the cursor and spin on a click; the marquee pauses on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const sticker = page.locator('[data-sticker-slot] > span').first();
  await sticker.click();
  await expect(sticker).toHaveAttribute('data-spinning', 'true');

  const track = page.locator('[data-marquee-track]');
  await page.evaluate(() => document.querySelector('[data-marquee-track]')!.parentElement!.scrollIntoView({ block: 'center' }));
  const box = (await track.boundingBox())!;
  await page.mouse.move(200, box.y + box.height / 2);
  await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
});
