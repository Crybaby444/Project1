import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { expect, test } from '@playwright/test';
import en from '../messages/site/en.json' with { type: 'json' };
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

test('the home leads into the catalog: the header has none (owner, 2026-11-13)', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('[data-home="hero"]');
  await expect(hero.getByRole('link', { name: en.landing.hero.find })).toHaveAttribute('href', '/c');
  await expect(hero.getByRole('link', { name: en.landing.hero.lend })).toHaveAttribute('href', '/listings/new');
  await expect(page.getByRole('banner').getByRole('button', { name: /catalog/i })).toHaveCount(0);
});

test('a signed-in person sees the account menu and is not asked to sign up', async ({ page, context }) => {
  await asOwnVisitor(context);
  await registerByApi(page.request);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Account menu/ })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign up' })).toHaveCount(0);
});
