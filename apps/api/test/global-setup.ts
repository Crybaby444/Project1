import { execFileSync } from 'node:child_process';
import 'dotenv/config';

/** Brings the test database schema up to date before any test runs. */
export default function setup(): void {
  const url =
    process.env['TEST_DATABASE_URL'] ??
    process.env['DATABASE_URL']?.replace(/\/yoyo_dev(\?|$)/, '/yoyo_test$1') ??
    'postgresql://localhost:5432/yoyo_test';
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
