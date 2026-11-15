import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { expect, test } from '@playwright/test';
import en from '../messages/site/en.json' with { type: 'json' };
import main from '../messages/en.json' with { type: 'json' };
import lv from '../messages/site/lv.json' with { type: 'json' };
import ru from '../messages/site/ru.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';

const LANGUAGES = [
  { locale: 'en', prefix: '', m: en },
  { locale: 'lv', prefix: '/lv', m: lv },
  { locale: 'ru', prefix: '/ru', m: ru },
] as const;

for (const { locale, prefix, m } of LANGUAGES) {
  test(`the v16 home in ${locale}: one h1, every scene, the facts from the booking rules`, async ({ page }) => {
    await page.goto(`${prefix}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeAttached();
    for (const scene of ['hero', 'night', 'what', 'facts', 'finale']) {
      await expect(page.locator(`[data-home="${scene}"]`)).toHaveCount(1);
    }
    await expect(page.getByRole('heading', { level: 2, name: m.landing.facts.label })).toBeAttached();
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(m.landing.finale.line1, 'i') })).toBeAttached();
    // The numbers are the rules the deals keep, not typed copy.
    const values = await page.locator('[data-fact] b[data-value]').evaluateAll((els) => els.map((e) => e.getAttribute('data-value')));
    expect(values).toEqual(['0', String(DEFAULT_BOOKING_SETTINGS.inspectionHours), '1', '100', '3']);
  });
}

test('What is Yoyo leads into the catalog and to lending', async ({ page }) => {
  await page.goto('/what-is-yoyo');
  const hero = page.locator('[data-home="hero"]');
  await expect(hero.getByRole('link', { name: en.landing.hero.find })).toHaveAttribute('href', '/c');
  await expect(hero.getByRole('link', { name: en.landing.hero.lend })).toHaveAttribute('href', '/listings/new');
});

test('the home is the marketplace: search what, where and when, items on the string, categories in the header (owner, 2026-11-16)', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('[data-home-search]');
  await search.getByLabel(main.market.search.what).fill('drill');
  await search.getByRole('button', { name: main.market.search.submit }).click();
  await expect(page).toHaveURL(/\/search\?q=drill$/);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: main.market.hero.title })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('navigation', { name: main.nav.main })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: main.nav.whatIsYoyo })).toHaveAttribute('href', '/what-is-yoyo');
});

test('a signed-in person sees the account menu and is not asked to sign up', async ({ page, context }) => {
  await asOwnVisitor(context);
  await registerByApi(page.request);
  await page.goto('/what-is-yoyo');
  await expect(page.getByRole('button', { name: /^Account menu/ })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign up' })).toHaveCount(0);
});
