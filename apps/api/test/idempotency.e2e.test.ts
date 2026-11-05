import { Body, type CanActivate, Controller, type ExecutionContext, Injectable, Post, UseGuards } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../src/common/app-error';
import { Idempotent } from '../src/idempotency/idempotent.decorator';
import { resetDeals } from './support/db';
import { createTestApp, type TestApp } from './support/test-app';

/** Signs the request in as `x-user` (the real AuthGuard is covered elsewhere). */
@Injectable()
class HeaderUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>();
    req.user = { id: req.headers['x-user'] ?? 'u1' };
    return true;
  }
}

let calls = 0;
let gate: Promise<void> = Promise.resolve();

@Controller('test-idempotency')
@UseGuards(HeaderUserGuard)
class IdempotencyTestController {
  @Post('required')
  @Idempotent({ required: true })
  async required(@Body() body: { amount?: number; fail?: boolean }) {
    calls += 1;
    await gate;
    if (body.fail) throw new AppError('PAYMENT_DECLINED', 402);
    return { call: calls, amount: body.amount ?? 0 };
  }

  @Post('optional')
  @Idempotent({ required: false })
  optional() {
    calls += 1;
    return { call: calls };
  }
}

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp({ controllers: [IdempotencyTestController] });
});

afterAll(async () => {
  await t.close();
});

beforeEach(async () => {
  calls = 0;
  gate = Promise.resolve();
  await resetDeals(t.prisma);
});

const post = (path: string, key?: string, body: object = { amount: 5 }, user = 'u1') => {
  const req = request(t.server).post(`/api/v1/test-idempotency/${path}`).set('x-user', user).send(body);
  return key === undefined ? req : req.set('Idempotency-Key', key);
};

describe('Idempotency-Key', () => {
  it('answers a repeat with the stored answer and runs the handler once', async () => {
    const first = await post('required', 'key-00000001').expect(201);
    const again = await post('required', 'key-00000001').expect(201);
    expect(again.body).toEqual(first.body);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect(first.headers['idempotent-replayed']).toBeUndefined();
    expect(calls).toBe(1);
  });

  it('is required where money moves, and must look like a key', async () => {
    expect((await post('required').expect(400)).body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    expect((await post('required', 'short').expect(400)).body.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      fields: { 'Idempotency-Key': expect.any(String) },
    });
    await post('optional').expect(201);
    await post('optional').expect(201);
    expect(calls).toBe(2);
  });

  it('refuses the same key with a different request', async () => {
    await post('required', 'key-00000002', { amount: 5 }).expect(201);
    expect((await post('required', 'key-00000002', { amount: 6 }).expect(409)).body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('answers 409 IDEMPOTENCY_IN_PROGRESS while the first one is still running', async () => {
    let open!: () => void;
    gate = new Promise((resolve) => (open = resolve));
    const first = post('required', 'key-00000003');
    const firstDone = first.then((res) => res);
    // Let the first request reach the handler before the second arrives.
    while (calls === 0) await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await post('required', 'key-00000003').expect(409);
    expect(second.body.error.code).toBe('IDEMPOTENCY_IN_PROGRESS');
    open();
    expect((await firstDone).status).toBe(201);
    expect(calls).toBe(1);
  });

  it('frees the key when the request fails, so it can be retried', async () => {
    await post('required', 'key-00000004', { fail: true }).expect(402);
    await post('required', 'key-00000004', { fail: true }).expect(402);
    expect(calls).toBe(2);
  });

  it('keeps the keys of different users apart', async () => {
    await post('required', 'key-00000005', { amount: 5 }, 'u1').expect(201);
    const other = await post('required', 'key-00000005', { amount: 7 }, 'u2').expect(201);
    expect(other.body).toEqual({ call: 2, amount: 7 });
  });
});
