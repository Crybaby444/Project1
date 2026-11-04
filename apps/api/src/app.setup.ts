import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { ErrorFilter } from './common/error.filter';
import type { Env } from './config/env';

/** Single place for HTTP-level app configuration, shared by main.ts and the tests. */
export function configureApp(app: INestApplication, env: Pick<Env, 'WEB_ORIGIN' | 'TRUST_PROXY_HOPS'>): void {
  app.setGlobalPrefix('api/v1');
  if (env.TRUST_PROXY_HOPS > 0) {
    // Behind N proxies req.ip is the client, not the last proxy (rate limits and session records use it).
    (app.getHttpAdapter().getInstance() as Express).set('trust proxy', env.TRUST_PROXY_HOPS);
  }
  app.use(helmet());
  app.use(cookieParser());
  // Answer CORS only for the web app's origin; any other origin gets no CORS headers at all.
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) =>
      callback(null, origin === env.WEB_ORIGIN),
    credentials: true,
  });
  // Every body, query and param typed with a nestjs-zod DTO is validated before the handler runs.
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ErrorFilter());
}
