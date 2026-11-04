import 'reflect-metadata';
import type { Server } from 'node:http';
import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { CLOCK } from '../../src/clock/clock';
import { ENV, loadEnv, type Env } from '../../src/config/env';
import { MAIL_PROVIDER, type MailProvider } from '../../src/mail/mail.provider';
import { MailService } from '../../src/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FakeClock } from './fake-clock';
import { FakeMailProvider } from './fake-mail';

export interface TestAppOptions {
  /** Environment overrides on top of the test environment from vitest.config.mts. */
  env?: Record<string, string | undefined>;
  /** Extra controllers that exist only in tests (e.g. routes that throw on purpose). */
  controllers?: Type<unknown>[];
  /** Replaces the fake mailbox, e.g. with a provider that fails. */
  mailProvider?: MailProvider;
  /** Further providers to replace, e.g. how the geocoder waits. */
  providers?: { provide: unknown; useValue: unknown }[];
}

export interface TestApp {
  app: INestApplication;
  server: Server;
  env: Env;
  clock: FakeClock;
  /** Every email the app sent (unless `mailProvider` replaced it). */
  mail: FakeMailProvider;
  prisma: PrismaService;
  /** Waits until mail handed over in the background has been "sent". */
  mailSent(): Promise<void>;
  close(): Promise<void>;
}

/** The real AppModule, configured exactly like main.ts, with a fake clock and a fake mailbox. */
export async function createTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const env = loadEnv({ ...process.env, ...options.env });
  const clock = new FakeClock();
  const mail = new FakeMailProvider();
  let builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  });
  for (const { provide, useValue } of options.providers ?? []) builder = builder.overrideProvider(provide).useValue(useValue);
  const moduleRef = await builder
    .overrideProvider(ENV)
    .useValue(env)
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(MAIL_PROVIDER)
    .useValue(options.mailProvider ?? mail)
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app, env);
  await app.init();
  return {
    app,
    server: app.getHttpServer() as Server,
    env,
    clock,
    mail,
    prisma: app.get(PrismaService),
    mailSent: () => app.get(MailService).idle(),
    close: () => app.close(),
  };
}

/** The token from a `…?token=…` link in an email. */
export function tokenFrom(text: string): string {
  const match = /[?&]token=([A-Za-z0-9_-]+)/.exec(text);
  if (!match) throw new Error(`no token link in: ${text}`);
  return match[1]!;
}

/** Value of a cookie from a response's Set-Cookie headers. */
export function cookieValue(setCookie: string[] | string | undefined, name: string): string | undefined {
  const all = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const line = all.find((cookie) => cookie.startsWith(`${name}=`));
  return line?.slice(name.length + 1).split(';')[0];
}

/** The Set-Cookie line for one cookie, attributes included. */
export function cookieLine(setCookie: string[] | string | undefined, name: string): string | undefined {
  const all = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return all.find((cookie) => cookie.startsWith(`${name}=`));
}
