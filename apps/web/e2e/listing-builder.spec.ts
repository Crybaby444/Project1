import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';
import { fixture } from './support/listings';

const b = en.builder;
const p = b.photos;

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

/** Picks files with the step's own file input (the "Choose photos" button is its label). */
async function choosePhotos(page: Page, ...names: string[]) {
  await page.getByLabel(p.choose).setInputFiles(names.map(fixture));
}

async function uploadThroughCrop(page: Page, name: string, how: 'crop' | 'whole') {
  await choosePhotos(page, name);
  const dialog = page.getByRole('dialog', { name: b.crop.title });
  await expect(dialog.getByRole('img', { name: b.crop.area })).toBeVisible();
  if (how === 'crop') {
    await dialog.getByRole('button', { name: b.crop.rotateRight }).click();
    await dialog.getByRole('img', { name: b.crop.area }).focus();
    await page.keyboard.press('+');
    await dialog.getByRole('button', { name: b.crop.apply }).click();
  } else {
    await dialog.getByRole('button', { name: b.crop.whole }).click();
  }
  await expect(dialog).toBeHidden();
}

test.describe('photos', () => {
  test('crop, upload, reorder with the keyboard; the order survives a reload', async ({ page }) => {
    await registerByApi(page.request);
    await page.goto('/listings/new');

    await uploadThroughCrop(page, 'item.jpg', 'crop');
    await expect(page.getByRole('img', { name: 'Photo 1 of 1' })).toBeVisible();
    // The first photo created the draft: the address is now the listing's own.
    await expect(page).toHaveURL(/\/listings\/[^/]+\/edit$/);

    await uploadThroughCrop(page, 'item-2.jpg', 'whole');
    await expect(page.getByRole('img', { name: 'Photo 2 of 2' })).toBeVisible();
    const second = await page.getByRole('img', { name: 'Photo 2 of 2' }).getAttribute('src');

    await page.getByRole('button', { name: 'Move photo 2' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await expect(
      page.getByRole('status').filter({ hasText: 'Photo dropped at position 1 of 2.' }),
    ).toBeAttached();
    await expect(page.getByRole('status').filter({ hasText: p.coverChanged })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('img', { name: 'Photo 1 of 2' })).toHaveAttribute('src', second!);
  });

  test('a file that is not a photo is refused with a plain reason', async ({ page }) => {
    await registerByApi(page.request);
    await page.goto('/listings/new');
    await choosePhotos(page, 'not-a-photo.jpg');
    await expect(
      page.getByRole('alert').filter({ hasText: `not-a-photo.jpg: ${en.errors.UNSUPPORTED_MEDIA}` }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('without photo storage on the server the step says so and the rest still saves', async ({ page }) => {
    await registerByApi(page.request);
    // This e2e API stores photos on disk; answer like a deployment without storage would.
    await page.route('**/api/v1/listings/*/photos', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'STORAGE_DISABLED', message: 'Photo storage is not configured' },
        }),
      }),
    );
    await page.goto('/listings/new');
    await uploadThroughCrop(page, 'item.jpg', 'whole');
    await expect(page.getByRole('alert').filter({ hasText: p.storageOff })).toBeVisible();
    await expect(page.getByLabel(p.choose)).toBeDisabled();

    await page.getByRole('link', { name: /Basics/ }).click();
    const saved = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && r.url().includes('/api/v1/listings/'),
    );
    await page.getByLabel(b.basics.title).fill('Camping tent for four');
    await expect(page.getByText(b.save.saving)).toBeVisible();
    expect((await saved).status()).toBe(200);
    await expect(page.getByText(b.save.saved)).toBeVisible();
    await page.reload();
    await page.getByRole('link', { name: /Basics/ }).click();
    await expect(page.getByLabel(b.basics.title)).toHaveValue('Camping tent for four');
  });
});
