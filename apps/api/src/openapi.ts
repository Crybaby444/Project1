import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { API_VERSION } from './version';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Yoyo API')
    .setDescription('Rent anything from people nearby.')
    .setVersion(API_VERSION)
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
