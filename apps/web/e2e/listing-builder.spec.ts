import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';
import { fixture, serveBlankMapTiles } from './support/listings';

const b = en.builder;
const p = b.photos;

test.beforeEach(async ({ context, page }) => {
  await asOwnVisitor(context);
  await serveBlankMapTiles(page);
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

test.describe('where and when', () => {
  test('address search sets the point and the district, the map moves it, days are marked with the keyboard', async ({
    page,
  }) => {
    await registerByApi(page.request);
    await page.goto('/listings/new?step=place');

    await page.getByRole('combobox', { name: b.place.search }).fill('Brīvības iela 1');
    await page.getByRole('option', { name: /Brīvības iela 1/ }).click();
    await expect(page.getByLabel(b.place.city)).toHaveValue('Rīga');
    await expect(page.getByLabel(b.place.district)).toHaveValue('Centrs');
    await expect(page).toHaveURL(/\/listings\/[^/]+\/edit\?step=place$/);
    await expect(page.locator('.leaflet-container')).toContainText('OpenStreetMap');

    // A click on the map moves the point; its district comes from the API's reverse search.
    const map = page.getByRole('region', { name: b.place.map });
    await map.scrollIntoViewIfNeeded();
    const box = (await map.boundingBox())!;
    await page.mouse.click(box.x + 40, box.y + box.height / 2);
    await expect(page.getByLabel(b.place.district)).toHaveValue('Majori');

    const grid = page.getByRole('grid').first();
    const datesSaved = page.waitForResponse(
      (r) => r.url().endsWith('/unavailability') && r.request().method() === 'PUT',
    );
    await grid.locator('button[tabindex="0"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+Enter');
    await expect(page.getByRole('list', { name: b.calendar.list }).getByRole('listitem')).toHaveCount(1);

    expect((await datesSaved).status()).toBe(200);
    await expect(page.getByText(b.save.saved)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(b.place.district)).toHaveValue('Majori');
    await expect(page.getByRole('list', { name: b.calendar.list }).getByRole('listitem')).toHaveCount(1);
    // The exact point is never part of the preview.
    const html = await page.getByRole('figure', { name: b.preview.label }).innerHTML();
    expect(html).not.toMatch(/56[.,]9|23[.,]7|24[.,]1/);
  });
});

test.describe('send for review', () => {
  test('a new owner goes through every step and sends the listing for review', async ({ page }) => {
    await registerByApi(page.request);
    await page.goto('/listings/new');

    await uploadThroughCrop(page, 'item.jpg', 'whole');
    await expect(page.getByRole('img', { name: 'Photo 1 of 1' })).toBeVisible();

    await page.getByRole('button', { name: b.next, exact: true }).click();
    await page.getByLabel(b.basics.title).fill('PlayStation 5 with two controllers');
    await page.getByRole('radio', { name: 'Electronics' }).check({ force: true });
    await page.getByRole('radio', { name: 'Game consoles' }).check({ force: true });
    await page.getByRole('radio', { name: en.listingCondition.LIKE_NEW }).check({ force: true });
    await page
      .getByLabel(b.basics.description)
      .fill('A PS5 with two controllers and three games, ready for a weekend of play.');

    await page.getByRole('button', { name: b.next, exact: true }).click();
    // The site's own selects (components/ui/Select): open each and take its first option.
    const details = page.locator('main [role="combobox"][aria-haspopup="listbox"]');
    for (const select of await details.all()) {
      await select.click();
      await page.getByRole('listbox').getByRole('option').first().click();
    }
    await page.getByLabel(/^Controllers/).fill('2');

    await page.getByRole('button', { name: b.next, exact: true }).click();
    await page.getByLabel(b.price.daily).fill('15');
    await page.getByLabel(b.price.deposit).fill('100');

    await page.getByRole('button', { name: b.next, exact: true }).click();
    await page.getByRole('combobox', { name: b.place.search }).fill('Brīvības iela 1');
    await page.getByRole('option', { name: /Brīvības iela 1/ }).click();
    await expect(page.getByLabel(b.place.district)).toHaveValue('Centrs');

    await page.getByRole('button', { name: b.next, exact: true }).click();
    await page.getByRole('checkbox', { name: en.listingRules.ID_AT_PICKUP }).check({ force: true });
    await expect(page.getByText(b.submit.ready)).toBeVisible();
    await page.getByRole('button', { name: b.submit.send }).click();

    await expect(page).toHaveURL(/\/dashboard\/lending$/);
    const { items } = (await (await page.request.get('/api/v1/me/listings')).json()) as {
      items: { status: string; title: string }[];
    };
    expect(items).toEqual([
      expect.objectContaining({ status: 'PENDING_REVIEW', title: 'PlayStation 5 with two controllers' }),
    ]);
  });

  test('a change saved in another tab stops this one instead of being overwritten', async ({
    page,
    context,
  }) => {
    await registerByApi(page.request);
    const { createListingByApi } = await import('./support/listings');
    const listing = await createListingByApi(page.request, { title: 'Camping tent' });
    await page.goto(`/listings/${listing.id}/edit?step=basics`);
    await expect(page.getByLabel(b.basics.title)).toHaveValue('Camping tent');

    const other = await context.newPage();
    await serveBlankMapTiles(other);
    await other.goto(`/listings/${listing.id}/edit?step=basics`);
    await other.getByLabel(b.basics.title).fill('Camping tent for four');
    await expect(other.getByText(b.save.saved)).toBeVisible();

    await page.getByLabel(b.basics.title).fill('Camping tent, two people');
    await expect(page.getByRole('alert').filter({ hasText: b.conflict.title })).toBeVisible();
    await page.getByRole('button', { name: b.conflict.reload }).click();
    await expect(page.getByLabel(b.basics.title)).toHaveValue('Camping tent for four');
  });
});
