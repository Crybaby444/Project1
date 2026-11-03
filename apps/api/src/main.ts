import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Local development reads apps/api/.env; hosting provides real environment variables.
  if (existsSync('.env')) process.loadEnvFile('.env');
  const env = loadEnv(process.env);

  const app = await NestFactory.create(AppModule);
  configureApp(app, env);
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}

void bootstrap();
