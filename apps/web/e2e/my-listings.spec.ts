import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';
import {
  approveByAdmin,
  createListingByApi,
  readyListingByApi,
  signInAsAdmin,
  submitByApi,
} from './support/listings';

const m = en.myListings;

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

test('a visitor is sent to sign in first', async ({ page }) => {
  await page.goto('/dashboard/lending');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Flending$/);
});

test('a new owner is invited to lend the first item', async ({ page }) => {
  await registerByApi(page.request);
  await page.goto('/dashboard/lending');
  await expect(page.getByRole('heading', { name: m.emptyTitle })).toBeVisible();
});

test('a draft shows up and can be deleted for good', async ({ page }) => {
  await registerByApi(page.request);
  await createListingByApi(page.request, { title: 'Garden ladder' });
  await page.goto('/dashboard/lending');
  const card = page.getByRole('article').filter({ hasText: 'Garden ladder' });
  await expect(card.getByText(en.listingStatus.DRAFT)).toBeVisible();

  await card.getByRole('button', { name: en.listingActions.delete }).click();
  const dialog = page.getByRole('dialog', { name: en.listingActions.deleteTitle });
  await expect(dialog).toContainText(en.listingActions.deleteDraft);
  await dialog.getByRole('button', { name: en.listingActions.deleteConfirm }).click();
  await expect(page.getByRole('heading', { name: m.emptyTitle })).toBeVisible();
});

test('a published listing can be hidden and shown again', async ({ page, browser, baseURL }) => {
  await registerByApi(page.request);
  const listing = await readyListingByApi(page.request, 'Kayak for two people');
  await submitByApi(page.request, listing.id);
  const admin = await browser.newContext({ baseURL });
  await asOwnVisitor(admin);
  const adminPage = await admin.newPage();
  await signInAsAdmin(adminPage);
  await approveByAdmin(adminPage.request, listing.id);
  await admin.close();

  await page.goto('/dashboard/lending');
  const card = page.getByRole('article').filter({ hasText: 'Kayak for two people' });
  await expect(card.getByText(en.listingStatus.PUBLISHED)).toBeVisible();
  await card.getByRole('button', { name: en.listingActions.hide }).click();
  await expect(card.getByText(en.listingStatus.HIDDEN)).toBeVisible();

  await page.getByRole('button', { name: m.filter.HIDDEN }).click();
  await expect(page).toHaveURL(/status=HIDDEN/);
  await card.getByRole('button', { name: en.listingActions.unhide }).click();
  await expect(page.getByText(m.emptyFilter)).toBeVisible();
});
