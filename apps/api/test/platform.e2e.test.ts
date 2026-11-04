import 'reflect-metadata';
import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { createZodDto } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RateLimitedError } from '../src/common/app-error';
import { createTestApp, type TestApp } from './support/test-app';

class EchoDto extends createZodDto(z.object({ email: z.email() })) {}

/** Routes that exist only in this test: they exercise the platform, not a feature. */
@Controller('__test')
class PlatformTestController {
  @Post('echo')
  @HttpCode(200)
  echo(@Body() body: EchoDto): EchoDto {
    return body;
  }

  @Get('boom')
  boom(): never {
    throw new Error('secret-detail');
  }

  @Get('ip')
  ip(@Req() req: Request): { ip: string | undefined } {
    return { ip: req.ip };
  }

  @Get('limited')
  limited(): never {
    throw new RateLimitedError(42);
  }

  @Get('cookies')
  cookies(@Req() req: Request): { cookies: unknown } {
    return { cookies: req.cookies };
  }
}

const valid = { email: 'anna@mail.lv' };

describe('API platform: errors, validation and protection', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ controllers: [PlatformTestController] });
  });

  afterAll(async () => {
    await t.close();
  });

  it('answers invalid input with VALIDATION_FAILED and a message per field', async () => {
    const res = await request(t.server).post('/api/v1/__test/echo').send({ email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_FAILED', message: expect.any(String), fields: { email: expect.any(String) } },
    });
  });

  it('refuses unsafe requests from a foreign Origin', async () => {
    const res = await request(t.server).post('/api/v1/__test/echo').set('Origin', 'https://evil.example').send(valid);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORIGIN_FORBIDDEN');
  });

  it('lets unsafe requests through from the web origin and from clients that send no Origin', async () => {
    expect((await request(t.server).post('/api/v1/__test/echo').send(valid)).status).toBe(200);
    const fromSite = await request(t.server)
      .post('/api/v1/__test/echo')
      .set('Origin', 'http://localhost:3000')
      .send(valid);
    expect(fromSite.status).toBe(200);
    expect(fromSite.body).toEqual(valid);
  });

  it('does not check the Origin of safe requests', async () => {
    const res = await request(t.server).get('/api/v1/__test/ip').set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
  });

  it('answers unknown routes with NOT_FOUND in the same error format', async () => {
    const res = await request(t.server).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });

  it('hides the details of unexpected errors behind INTERNAL', async () => {
    const boom = await request(t.server).get('/api/v1/__test/boom');
    expect(boom.status).toBe(500);
    expect(boom.body).toEqual({ error: { code: 'INTERNAL', message: expect.any(String) } });
    expect(JSON.stringify(boom.body)).not.toContain('secret-detail');
  });

  it('answers a rate-limited request with 429 RATE_LIMITED and Retry-After', async () => {
    const res = await request(t.server).get('/api/v1/__test/limited');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBe('42');
  });

  it('sends security headers', async () => {
    const res = await request(t.server).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('parses request cookies', async () => {
    const res = await request(t.server).get('/api/v1/__test/cookies').set('Cookie', 'yoyo_at=abc');
    expect(res.body.cookies).toEqual({ yoyo_at: 'abc' });
  });
});

describe('TRUST_PROXY_HOPS', () => {
  async function ipSeenBy(hops: number): Promise<string> {
    const t = await createTestApp({ env: { TRUST_PROXY_HOPS: String(hops) }, controllers: [PlatformTestController] });
    try {
      const res = await request(t.server).get('/api/v1/__test/ip').set('X-Forwarded-For', '203.0.113.7');
      return res.body.ip as string;
    } finally {
      await t.close();
    }
  }

  it('takes the client address from X-Forwarded-For behind one trusted proxy', async () => {
    expect(await ipSeenBy(1)).toBe('203.0.113.7');
  });

  it('ignores X-Forwarded-For when no proxy is trusted', async () => {
    expect(await ipSeenBy(0)).not.toBe('203.0.113.7');
  });
});
