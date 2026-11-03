import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { API_VERSION } from './version';

/** OpenAPI document of the running app; zod DTOs become real JSON schemas. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Yoyo API')
    .setDescription('Peer-to-peer rental marketplace API')
    .setVersion(API_VERSION)
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
