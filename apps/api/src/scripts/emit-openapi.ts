import 'reflect-metadata';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { loadEnv } from '../config/env';
import { buildOpenApiDocument } from '../openapi';

/** Writes apps/api/openapi.json, the source for @yoyo/api-client. No database connection is made. */
async function emit(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app, loadEnv(process.env));
  const target = join(__dirname, '..', '..', 'openapi.json');
  writeFileSync(target, `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`);
  await app.close();
  console.log(`OpenAPI document written to ${target}`);
}

void emit();
