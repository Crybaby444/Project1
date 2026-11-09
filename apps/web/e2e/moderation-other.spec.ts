import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lvMail from '../../api/src/mail/i18n/lv.json' with { type: 'json' };
import { asOwnVisitor } from './support/accounts';
import { publishListing, uniqueWord } from './support/catalog';
import { signInAsAdmin } from './support/listings';
import { latestTo } from './support/mailpit';

const m = en.moderation;

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

test('the administrator moves a listing out of «Other»; it keeps its status and the owner is told in Latvian', async ({ page, browser }) => {
  const title = `Odd thing ${uniqueWord('misc')}`;
  const listing = await publishListing(browser, { title, categorySlug: 'other', fields: { attributes: {} } });

  await signInAsAdmin(page);
  // The queue loads in the browser: wait for each page (its count, or the empty state) before looking.
  let card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) });
  for (let number = 1; number <= 20; number++) {
    await page.goto(`/admin/listings?queue=other&page=${number}`);
    await expect(page.getByRole('status').filter({ hasText: /Showing/ }).or(page.getByRole('heading', { name: m.otherEmptyTitle }))).toBeVisible();
    if (await card.count()) break;
  }
  await expect(page.getByRole('link', { name: m.queueOther })).toHaveAttribute('aria-current', 'page');
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: m.approve })).toHaveCount(0);

  await card.getByRole('button', { name: m.move.button }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(m.move.label).selectOption({ label: 'Drills & drivers' });
  await dialog.getByRole('button', { name: m.move.submit }).click();
  await expect(page.getByText('Moved to Tools · Drills & drivers. The owner gets an email.')).toBeVisible();

  // Still published, now in its new category.
  const answer = await page.request.get(`/api/v1/catalog/listings/${listing.id}`);
  expect(answer.status()).toBe(200);
  await page.goto('/c/drills-drivers');
  const mail = await latestTo(listing.ownerEmail!, (sent) => sent.subject === lvMail.listingMoved.subject);
  expect(mail.text).toContain(title);
});
