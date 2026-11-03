import type { INestApplication } from '@nestjs/common';
import {
  type ApiResponseSchemaHost,
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { z } from 'zod';
import { API_VERSION } from './config/version.js';

type SchemaObject = ApiResponseSchemaHost['schema'];

/** Converts a zod schema to an OpenAPI 3.0 schema object for @ApiResponse({ schema }). */
export function zodToOpenApi(schema: z.ZodType): SchemaObject {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, { target: 'openapi-3.0' }) as Record<
    string,
    unknown
  >;
  return json as SchemaObject;
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder().setTitle('Yoyo API').setVersion(API_VERSION).build();
  return SwaggerModule.createDocument(app, config);
}
