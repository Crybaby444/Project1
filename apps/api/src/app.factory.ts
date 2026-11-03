import 'reflect-metadata';
import type { INestApplication, LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ENV, type Env } from './config/env';
import { buildOpenApiDocument } from './openapi';

export const API_PREFIX = 'api/v1';

interface CreateAppOptions {
  logger?: LogLevel[] | false;
}

/** Builds a fully configured (but not listening) application. */
export async function createApp(options: CreateAppOptions = {}): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: options.logger ?? ['error', 'warn', 'log'],
  });
  const env = app.get<Env>(ENV);
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();
  if (env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, () => buildOpenApiDocument(app));
  }
  return app;
}
