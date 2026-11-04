import { cents, formatMoney } from '@yoyo/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { day, paidDeal, requestBooking, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;
let owner: Client;
let renter: Client;

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  await t.close();
});

beforeEach(async () => {
  await resetDeals(t.prisma);
  await resetListings(t);
  await resetAccounts(t.prisma);
  t.mail.sent.length = 0;
  owner = await signedInClient(t, { name: 'Andris', locale: 'lv' });
  renter = await signedInClient(t, { name: 'Анна', locale: 'ru' });
});

const subjects = (client: Client) => t.mail.to(client.email).map((m) => m.subject);

describe('deal emails', () => {
  it('tells each side about each step, in their own language', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    await t.mailSent();
    const request = t.mail.to(owner.email);
    expect(request.map((m) => m.subject)).toEqual(['Jauns pieprasījums: “Bosch cordless drill”']);
    expect(request[0]).toMatchObject({ template: 'deal-event' });
    expect(request[0]!.text).toContain('Анна');
    expect(request[0]!.text).toContain(formatMoney(cents(4_500), 'lv'));
    expect(request[0]!.html).toContain(`/lv/bookings/${booking.id}`);

    await step(owner, booking.id, { type: 'ACCEPT' });
    await t.mailSent();
    expect(subjects(renter)).toEqual(['Ваш запрос на «Bosch cordless drill» принят']);
    expect(t.mail.to(renter.email)[0]!.text).toContain(formatMoney(cents(9_950), 'ru'));
    expect(t.mail.to(renter.email)[0]!.html).toContain(`/ru/bookings/${booking.id}`);
  });

  it('writes to the administrators when a dispute opens', async () => {
    const admin = await signedInClient(t, { role: 'ADMIN', locale: 'en' });
    const id = await paidDeal(t, owner, renter);
    await step(owner, id, { type: 'MARK_HANDED_OVER' });
    await step(renter, id, { type: 'REPORT_NOT_RECEIVED', note: 'Nobody came' });
    await t.mailSent();
    expect(subjects(admin)).toEqual(['Dispute to decide: “Bosch cordless drill”']);
    expect(subjects(owner)).toContain('Sākts strīds par “Bosch cordless drill”');
  });

  it('writes about price offers', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const offer = (await renter.post(`/listings/${listing.id}/offers`).send({ start: day(t, 2), end: day(t, 3), dailyCents: 1200 }).expect(201)).body.offer;
    await t.mailSent();
    expect(subjects(owner)).toEqual([`Анна piedāvā ${formatMoney(cents(1_200), 'lv')} dienā par “Bosch cordless drill”`]);
    await owner.post(`/offers/${offer.id}/accept`).expect(200);
    await t.mailSent();
    expect(subjects(renter)).toEqual(['Ваше предложение за «Bosch cordless drill» принято']);
  });

  it('sends nothing to a deleted account', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 1, 2);
    await t.prisma.user.update({ where: { id: renter.user.id }, data: { deletedAt: t.clock.now() } });
    await step(owner, booking.id, { type: 'DECLINE' });
    await t.mailSent();
    expect(t.mail.to(renter.email)).toEqual([]);
  });
});

describe('deal emails over the daily budget', () => {
  it('still lets the deal go on', async () => {
    // 2 a day: one for notifications, one kept for account emails.
    const small = await createTestApp({ env: { MAIL_DAILY_LIMIT: '2' } });
    try {
      await resetDeals(small.prisma);
      const o = await signedInClient(small, { locale: 'en' });
      const r = await signedInClient(small, { locale: 'en' });
      const listing = await seedListing(small, o.user, { status: 'PUBLISHED' });
      const booking = await requestBooking(small, r, listing.id, 1, 2);
      await step(o, booking.id, { type: 'ACCEPT' });
      await small.mailSent();
      expect(small.mail.sent).toHaveLength(1);
    } finally {
      await small.close();
    }
  });
});
