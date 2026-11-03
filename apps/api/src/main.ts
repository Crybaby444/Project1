import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadEnv } from './config/env';
import { buildOpenApiDocument } from './openapi';

async function bootstrap(): Promise<void> {
  // Local development reads apps/api/.env; hosting provides real environment variables.
  if (existsSync('.env')) process.loadEnvFile('.env');
  const env = loadEnv(process.env);

  const app = await NestFactory.create(AppModule);
  configureApp(app, env);
  if (env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app));
  }
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}

void bootstrap();
