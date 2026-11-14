import { expect, test } from '@playwright/test';
import deals from '../messages/deals/en.json' with { type: 'json' };
import { administrator, person, publishedListing, returnedDealByApi, stepByApi } from './support/deals';

const r = deals.reviews;

test('after a completed deal both sides review each other; blind until both wrote, then on the profile and the item page', async ({ browser, baseURL }) => {
  const admin = await administrator(browser, baseURL);
  const owner = await person(browser, baseURL, 'Olga Ozola');
  const renter = await person(browser, baseURL, 'Rita Rudzīte');
  const title = `Camping stove ${Date.now()}`;
  const listingId = await publishedListing(owner.page, admin, title);
  const id = await returnedDealByApi(renter.page.request, owner.page.request, listingId);
  await stepByApi(owner.page.request, id, { type: 'ALL_FINE' });

  // The renter: the person, the item, a few words.
  await renter.page.goto(`/bookings/${id}`);
  const form = renter.page.locator('[data-deal-reviews]');
  await form.getByRole('radiogroup', { name: 'Stars for Olga Ozola' }).getByRole('radio', { name: '5 stars' }).check({ force: true });
  await form.getByRole('radiogroup', { name: r.deal.aboutItem }).getByRole('radio', { name: '4 stars' }).check({ force: true });
  await form.getByLabel(r.deal.text).fill('Clear instructions, the stove worked perfectly.');
  await form.getByRole('button', { name: r.deal.submit }).click();
  await expect(form.getByText(/Thank you\. Your review shows once Olga Ozola writes theirs/)).toBeVisible();

  // Blind: the owner is told, not shown.
  await owner.page.goto(`/bookings/${id}`);
  const ownerForm = owner.page.locator('[data-deal-reviews]');
  await expect(ownerForm.getByText('Rita Rudzīte has written their review. It shows once you write yours.')).toBeVisible();
  await expect(ownerForm.getByText('Clear instructions, the stove worked perfectly.')).toHaveCount(0);
  await expect(ownerForm.getByRole('radiogroup', { name: r.deal.aboutItem })).toHaveCount(0);
  await ownerForm.getByRole('radiogroup', { name: 'Stars for Rita Rudzīte' }).getByRole('radio', { name: '5 stars' }).check({ force: true });
  await ownerForm.getByLabel(r.deal.text).fill('Returned on time and spotless.');
  await ownerForm.getByRole('button', { name: r.deal.submit }).click();
  await expect(ownerForm.getByText('Clear instructions, the stove worked perfectly.')).toBeVisible();

  // Public now: on the item page and the owner's profile.
  await renter.page.goto(`/listings/${listingId}`);
  await expect(renter.page.getByRole('heading', { name: r.itemHeading })).toBeVisible();
  await expect(renter.page.getByText('Clear instructions, the stove worked perfectly.')).toBeVisible();
  await expect(renter.page.getByRole('img', { name: '4 of 5' }).first()).toBeVisible();
});
