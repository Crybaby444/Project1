import type { INestApplication } from '@nestjs/common';
import type { Env } from './config/env';

/** Single place for HTTP-level app configuration, shared by main.ts and the tests. */
export function configureApp(app: INestApplication, env: Pick<Env, 'WEB_ORIGIN'>): void {
  app.setGlobalPrefix('api/v1');
  // Answer CORS only for the web app's origin; any other origin gets no CORS headers at all.
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) =>
      callback(null, origin === env.WEB_ORIGIN),
    credentials: true,
  });
}
