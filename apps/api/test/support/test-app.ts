import 'reflect-metadata';
import type { Server } from 'node:http';
import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { ENV, loadEnv, type Env } from '../../src/config/env';

export interface TestAppOptions {
  /** Environment overrides on top of the test environment from vitest.config.mts. */
  env?: Record<string, string | undefined>;
  /** Extra controllers that exist only in tests (e.g. routes that throw on purpose). */
  controllers?: Type<unknown>[];
}

export interface TestApp {
  app: INestApplication;
  server: Server;
  env: Env;
  close(): Promise<void>;
}

/** The real AppModule, configured exactly like main.ts, with test-only overrides. */
export async function createTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const env = loadEnv({ ...process.env, ...options.env });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app, env);
  await app.init();
  return { app, server: app.getHttpServer() as Server, env, close: () => app.close() };
}
