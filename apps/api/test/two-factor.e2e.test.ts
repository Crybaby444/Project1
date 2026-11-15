import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { totpAt } from '../src/auth/totp';
import { resetAccounts } from './support/db';
import { signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

const HOUR = 60 * 60_000;

describe('two-step sign-in (TOTP)', () => {
  let t: TestApp;
  let ada: Client;
  const login = (body: object) => request(t.server).post('/api/v1/auth/login').send(body);
  const codeNow = (secret: string, offsetSeconds = 0) => totpAt(secret, Math.floor(t.clock.now().getTime() / 1000) + offsetSeconds);

  async function turnOn(c: Client): Promise<string> {
    const { secret, uri } = (await c.post('/me/two-factor/setup').expect(200)).body;
    expect(uri).toContain(`secret=${secret}`);
    await c.post('/me/two-factor/enable').send({ code: codeNow(secret) }).expect(200);
    t.clock.advance(30_000); // the next code is a new one
    return secret;
  }

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await t.prisma.$executeRawUnsafe('TRUNCATE "AdminAuditLog"');
    await resetAccounts(t.prisma);
    t.clock.advance(HOUR + 60_000);
    ada = await signedInClient(t, { name: 'Ada', email: 'ada@mail.lv' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('is off until the app proves it has the secret; a wrong code leaves it off', async () => {
    expect((await ada.get('/me/two-factor').expect(200)).body).toEqual({ enabled: false });
    await ada.post('/me/two-factor/enable').send({ code: '123456' }).expect(409);
    const { secret } = (await ada.post('/me/two-factor/setup').expect(200)).body;
    const wrong = codeNow(secret) === '000000' ? '111111' : '000000';
    expect((await ada.post('/me/two-factor/enable').send({ code: wrong }).expect(401)).body.error.code).toBe('AUTH_CODE_INVALID');
    expect((await ada.get('/me/two-factor').expect(200)).body).toEqual({ enabled: false });
    await login({ email: 'ada@mail.lv', password: 'correct horse' }).expect(200);
  });

  it('once on, sign-in asks for the code, accepts it once, and refuses a wrong one', async () => {
    const secret = await turnOn(ada);
    const stored = await t.prisma.user.findUniqueOrThrow({ where: { id: ada.user.id } });
    expect(stored.totpSecret).not.toContain(secret); // kept encrypted

    expect((await login({ email: 'ada@mail.lv', password: 'correct horse' }).expect(401)).body.error.code).toBe('AUTH_CODE_REQUIRED');
    // A wrong password with a code still hears only "wrong credentials".
    expect((await login({ email: 'ada@mail.lv', password: 'nope', code: codeNow(secret) }).expect(401)).body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect((await login({ email: 'ada@mail.lv', password: 'correct horse', code: '999999' === codeNow(secret) ? '888888' : '999999' }).expect(401)).body.error.code).toBe('AUTH_CODE_INVALID');

    const code = codeNow(secret);
    const ok = await login({ email: 'ada@mail.lv', password: 'correct horse', code }).expect(200);
    expect(ok.body.user.email).toBe('ada@mail.lv');
    // The same code a second time is refused (someone watching the screen can't reuse it).
    expect((await login({ email: 'ada@mail.lv', password: 'correct horse', code }).expect(401)).body.error.code).toBe('AUTH_CODE_INVALID');
    // A phone clock half a minute behind is fine.
    t.clock.advance(60_000);
    await login({ email: 'ada@mail.lv', password: 'correct horse', code: codeNow(secret, -30) }).expect(200);
  });

  it('turning it off needs a current code', async () => {
    const secret = await turnOn(ada);
    await ada.post('/me/two-factor/disable').send({ code: '12' }).expect(400);
    await ada.post('/me/two-factor/disable').send({ code: codeNow(secret) }).expect(200);
    expect((await ada.get('/me/two-factor').expect(200)).body).toEqual({ enabled: false });
    await login({ email: 'ada@mail.lv', password: 'correct horse' }).expect(200);
  });

  it('a Google-only account sets a password first', async () => {
    const google = await signedInClient(t, { password: null });
    expect((await google.post('/me/two-factor/setup').expect(409)).body.error.details.why).toBe('NO_PASSWORD');
  });

  it('the owner resets it for someone who lost their phone, and the staff list shows who has it', async () => {
    const owner = await signedInClient(t, { role: 'ADMIN', staffRole: 'OWNER' });
    const ivo = await signedInClient(t, { role: 'ADMIN', staffRole: 'SUPPORT', email: 'ivo@mail.lv' });
    await turnOn(ivo);
    const staff = (await owner.get('/admin/staff').expect(200)).body.items;
    expect(staff.find((m: { id: string }) => m.id === ivo.user.id).twoFactor).toBe(true);
    await ivo.delete(`/admin/users/${owner.user.id}/two-factor`).expect(403);
    await owner.delete(`/admin/users/${ivo.user.id}/two-factor`).expect(204);
    await login({ email: 'ivo@mail.lv', password: 'correct horse' }).expect(200);
    expect((await owner.get('/admin/audit?action=TWO_FACTOR_RESET').expect(200)).body.total).toBe(1);
  });
});
