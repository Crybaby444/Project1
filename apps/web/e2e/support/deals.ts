import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { asOwnVisitor, registerByApi, uniqueEmail } from './accounts';
import { approveByAdmin, readyListingByApi, signInAsAdmin, submitByApi } from './listings';

/** Today in Riga (`YYYY-MM-DD`), where the e2e listings are. */
export function rigaDay(offset = 0): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** A signed-in person in a browser context of their own (their own visitor address too). */
export async function person(browser: Browser, baseURL: string | undefined, name: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL });
  await asOwnVisitor(context);
  const page = await context.newPage();
  await registerByApi(page.request, { email: uniqueEmail(name.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase().slice(0, 12) || 'deal'), name });
  return { context, page };
}

/**
 * The administrator's signed-in session, made once per worker: sign-ins of one account are limited
 * (20 an hour, 5 a minute), and the whole e2e run shares that budget.
 */
let adminSession: Promise<Awaited<ReturnType<BrowserContext['storageState']>>> | null = null;
let adminSince = 0;
/** Access tokens last 15 minutes and request contexts do not renew them: sign in again before that. */
const ADMIN_SESSION_MS = 10 * 60_000;

/** The e2e administrator in a context of their own (signed in once per worker, see above). */
export async function administrator(browser: Browser, baseURL: string | undefined): Promise<APIRequestContext> {
  if (Date.now() - adminSince > ADMIN_SESSION_MS) {
    adminSession = null;
    adminSince = Date.now();
  }
  adminSession ??= (async () => {
    const context = await browser.newContext({ baseURL });
    await asOwnVisitor(context);
    const page = await context.newPage();
    await signInAsAdmin(page);
    const state = await context.storageState();
    await context.close();
    return state;
  })();
  const context = await browser.newContext({ baseURL, storageState: await adminSession });
  await asOwnVisitor(context);
  return (await context.newPage()).request;
}

/** Lists a ready item as `owner` (15 € a day, 100 € deposit), approved, so it can be booked. */
export async function publishedListing(owner: Page, admin: APIRequestContext, title: string): Promise<string> {
  const listing = await readyListingByApi(owner.request, title);
  await submitByApi(owner.request, listing.id);
  await approveByAdmin(admin, listing.id);
  return listing.id;
}

type Booking = { id: string; version: number; status: string };

/** One step of a deal through the API, as `who`, with the current version and a fresh key. */
export async function stepByApi(who: APIRequestContext, id: string, event: Record<string, unknown>): Promise<Booking> {
  const { booking } = (await (await who.get(`/api/v1/bookings/${id}`)).json()) as { booking: Booking };
  const res = await who.post(`/api/v1/bookings/${id}/events`, {
    headers: { 'Idempotency-Key': `e2e-${randomUUID()}` },
    data: { version: booking.version, event },
  });
  expect(res.status(), await res.text()).toBe(200);
  return ((await res.json()) as { booking: Booking }).booking;
}

/** Tops a wallet up by the test card through the API. */
export async function topUpByApi(who: APIRequestContext, amountCents: number): Promise<void> {
  const token = await who.post('/api/v1/payments/card-tokens', {
    data: { number: '4242424242424242', expMonth: 12, expYear: 2034, cvc: '123', holder: 'Test Holder' },
  });
  expect(token.status(), await token.text()).toBe(201);
  const res = await who.post('/api/v1/wallet/top-ups', {
    headers: { 'Idempotency-Key': `e2e-${randomUUID()}` },
    data: { amountCents, cardToken: ((await token.json()) as { token: string }).token },
  });
  expect(res.status(), await res.text()).toBe(201);
}

/** A deal requested, accepted, signed and paid from the wallet, then handed over and returned (RETURNED). */
export async function returnedDealByApi(renter: APIRequestContext, owner: APIRequestContext, listingId: string): Promise<string> {
  await topUpByApi(renter, 20_000);
  const res = await renter.post('/api/v1/bookings', { data: { listingId, start: rigaDay(0), end: rigaDay(1) } });
  expect(res.status(), await res.text()).toBe(201);
  const { booking } = (await res.json()) as { booking: Booking };
  await stepByApi(owner, booking.id, { type: 'ACCEPT' });
  await stepByApi(owner, booking.id, { type: 'SIGN' });
  await stepByApi(renter, booking.id, { type: 'SIGN' });
  await stepByApi(renter, booking.id, { type: 'PAY', method: 'WALLET' });
  await stepByApi(owner, booking.id, { type: 'MARK_HANDED_OVER' });
  await stepByApi(renter, booking.id, { type: 'CONFIRM_RECEIVED' });
  await stepByApi(renter, booking.id, { type: 'MARK_RETURNED' });
  await stepByApi(owner, booking.id, { type: 'CONFIRM_RETURNED' });
  return booking.id;
}

/** Presses a step on the deal page and, if it asks, confirms it. */
export async function takeStep(page: Page, label: string | RegExp, confirm = true): Promise<void> {
  await page.getByRole('button', { name: label, exact: typeof label === 'string' }).click();
  if (confirm) await page.getByRole('dialog').getByRole('button', { name: 'Yes, confirm' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Reads the deal again (the other side acted in another browser). */
export async function reloadDeal(page: Page): Promise<void> {
  await page.reload();
  await expect(page.locator('[data-deal]')).toBeVisible();
}
