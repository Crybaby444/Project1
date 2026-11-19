import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './support/test-app';

/**
 * Security audit 2026-11-16: the routes that answer without signing in, on purpose (the catalog, public
 * profiles, signing in and up, health). Any other route must say 401 to a visitor; a new public route is
 * added here deliberately, never by accident.
 */
const PUBLIC = new Set([
  'GET /api/v1/auth/apple',
  'GET /api/v1/auth/google',
  'GET /api/v1/auth/google/callback',
  'GET /api/v1/auth/providers',
  'GET /api/v1/auth/username-available',
  'GET /api/v1/catalog/category-counts',
  'GET /api/v1/catalog/cities',
  'GET /api/v1/catalog/for-you',
  'GET /api/v1/catalog/items',
  'GET /api/v1/catalog/listings',
  'GET /api/v1/catalog/listings/{id}',
  'GET /api/v1/catalog/listings/{id}/address',
  'GET /api/v1/catalog/listings/{id}/reviews',
  'GET /api/v1/catalog/map',
  'GET /api/v1/catalog/places',
  'GET /api/v1/catalog/sitemap',
  'GET /api/v1/catalog/suggest',
  'GET /api/v1/categories',
  'GET /api/v1/health',
  'GET /api/v1/listings/{id}/booking-terms',
  'GET /api/v1/listings/{id}/quote',
  'GET /api/v1/media/{key}/{variant}',
  'GET /api/v1/people',
  'GET /api/v1/shops/{id}',
  'GET /api/v1/users/{id}',
  'GET /api/v1/users/{id}/followers',
  'GET /api/v1/users/{id}/following',
  'GET /api/v1/users/{id}/reviews',
  'GET /api/v1/users/{id}/shops',
  'POST /api/v1/analytics/hit',
  'POST /api/v1/auth/apple/callback',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/logout',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/reset-password',
  'POST /api/v1/auth/verify-email',
]);

type Doc = { paths: Record<string, Record<string, unknown>> };

describe('every route without a session', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('answers 401 unless it is on the public list', async () => {
    const doc = JSON.parse(readFileSync(join(__dirname, '..', 'openapi.json'), 'utf8')) as Doc;
    const unexpected: string[] = [];
    for (const [path, ops] of Object.entries(doc.paths)) {
      for (const method of Object.keys(ops)) {
        const route = `${method.toUpperCase()} ${path}`;
        if (PUBLIC.has(route)) continue;
        const call = (request(t.server) as unknown as Record<string, (url: string) => request.Test>)[method]!;
        const res = await call(path.replace(/\{[^}]+\}/g, 'x0')).set('Origin', 'http://localhost:3000').send({});
        if (res.status !== 401) unexpected.push(`${route} -> ${res.status}`);
      }
    }
    expect(unexpected).toEqual([]);
  }, 120_000);
});
