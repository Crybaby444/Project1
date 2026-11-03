import { execFileSync } from 'node:child_process';
import { testDatabaseUrl } from './test-db';

/** Brings the test database schema up to date before any test file runs. */
export default function setup(): void {
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}
