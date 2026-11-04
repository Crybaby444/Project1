import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { configureApp } from '../app.setup';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('GET /api/v1/health when the database is unreachable', () => {
  it('answers 503 degraded/down instead of crashing', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { isHealthy: async () => false } }],
    }).compile();
    const app = moduleRef.createNestApplication();
    configureApp(app, { WEB_ORIGIN: 'http://localhost:3000', TRUST_PROXY_HOPS: 0 });
    await app.init();

    const res = await request(app.getHttpServer()).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', db: 'down', version: '0.1.0' });
    await app.close();
  });
});
