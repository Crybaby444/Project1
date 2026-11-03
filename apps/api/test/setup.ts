import 'reflect-metadata';
import 'dotenv/config';

// Tests always run against the dedicated test database.
process.env['DATABASE_URL'] =
  process.env['TEST_DATABASE_URL'] ??
  process.env['DATABASE_URL']?.replace(/\/yoyo_dev(\?|$)/, '/yoyo_test$1') ??
  'postgresql://localhost:5432/yoyo_test';
process.env['WEB_ORIGIN'] ??= 'http://localhost:3000';
