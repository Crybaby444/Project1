import 'reflect-metadata';
import type { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ENV } from './config/env.module.js';
import type { Env } from './config/env.js';
import { buildOpenApiDocument } from './openapi.js';

export const API_PREFIX = 'api/v1';

/** Builds the configured Nest app (prefix, CORS) without listening. Shared by main.ts and tests. */
export async function createApp(options: NestApplicationOptions = {}): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, options);
  const env = app.get<Env>(ENV);
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();
  if (env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, () => buildOpenApiDocument(app));
  }
  return app;
}
