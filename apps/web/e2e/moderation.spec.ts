import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';
import { readyListingByApi, serveBlankMapTiles, signInAsAdmin, submitByApi } from './support/listings';

const m = en.moderation;

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

/** The queue is shared by every test; walk its pages to the card of `title`. */
async function openCard(page: Page, title: string) {
  for (let number = 1; number <= 50; number++) {
    await page.goto(`/admin/listings?page=${number}`);
    await expect(page.getByRole('heading', { level: 1, name: m.title })).toBeVisible();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /Showing|of/ })
        .or(page.getByRole('heading', { name: m.emptyTitle })),
    ).toBeVisible();
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) });
    if (await card.count()) return card;
    if (!(await page.getByRole('link', { name: m.next }).count())) break;
  }
  throw new Error(`"${title}" is not in the queue`);
}

test('an ordinary user sees no access, and the queue is never asked for', async ({ page }) => {
  await registerByApi(page.request);
  const asked: string[] = [];
  page.on('request', (request) => request.url().includes('/api/v1/admin/') && asked.push(request.url()));
  await page.goto('/admin/listings');
  await expect(page.getByRole('heading', { level: 1, name: en.noAccess.title })).toBeVisible();
  await page.getByRole('button', { name: /^Account menu/ }).click();
  await expect(page.getByRole('menuitem', { name: en.header.moderation })).toHaveCount(0);
  expect(asked).toEqual([]);
});

test('rejected with a reason, fixed by the owner, then approved', async ({ page, browser, baseURL }) => {
  const title = `Electric scooter ${Date.now()}`;
  await registerByApi(page.request);
  await serveBlankMapTiles(page);
  const listing = await readyListingByApi(page.request, title);
  await submitByApi(page.request, listing.id);

  const admin = await browser.newContext({ baseURL });
  await asOwnVisitor(admin);
  const adminPage = await admin.newPage();
  await signInAsAdmin(adminPage);

  // The administrator rejects it with a reason.
  let card = await openCard(adminPage, title);
  await expect(card.getByText('Rīga, Centrs')).toBeVisible();
  await card.getByRole('button', { name: m.reject }).click();
  const dialog = adminPage.getByRole('dialog', { name: m.rejectTitle });
  await dialog.getByLabel(m.reason).fill('The photo shows a bicycle, not a scooter.');
  await dialog.getByRole('button', { name: m.send }).click();
  await expect(adminPage.getByRole('status').filter({ hasText: m.rejected })).toBeVisible();

  // The owner sees the reason, fixes the title and sends it again.
  await page.goto('/dashboard/lending');
  const mine = page.getByRole('article').filter({ hasText: title });
  await expect(mine.getByText('The photo shows a bicycle, not a scooter.')).toBeVisible();
  await mine.getByRole('link', { name: en.myListings.fix }).click();
  await expect(page.getByRole('region', { name: en.listingStatus.REJECTED })).toContainText(
    'The photo shows a bicycle',
  );
  await page.getByLabel(en.builder.basics.title).fill(`${title}, fixed`);
  await expect(page.getByText(en.builder.save.saved)).toBeVisible();
  await page
    .getByRole('link', { name: /Rules & publish/ })
    .first()
    .click();
  await page.getByRole('button', { name: en.builder.submit.send }).click();
  await expect(page).toHaveURL(/\/dashboard\/lending$/);
  await expect(
    page
      .getByRole('article')
      .filter({ hasText: `${title}, fixed` })
      .getByText(en.listingStatus.PENDING_REVIEW),
  ).toBeVisible();

  // The administrator approves the fixed version.
  card = await openCard(adminPage, `${title}, fixed`);
  await card.getByRole('button', { name: m.approve }).click();
  await expect(adminPage.getByRole('status').filter({ hasText: m.approved })).toBeVisible();
  await admin.close();

  await page.reload();
  await expect(
    page
      .getByRole('article')
      .filter({ hasText: `${title}, fixed` })
      .getByText(en.listingStatus.PUBLISHED),
  ).toBeVisible();
});
