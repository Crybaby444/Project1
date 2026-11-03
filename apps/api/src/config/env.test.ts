import { loadEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://localhost:5432/yoyo_test',
  WEB_ORIGIN: 'http://localhost:3000',
};

describe('loadEnv', () => {
  it('lists every missing key in one error', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({})).toThrow(/WEB_ORIGIN/);
  });

  it('applies defaults', () => {
    expect(loadEnv(valid)).toMatchObject({ PORT: 4000, NODE_ENV: 'development' });
  });

  it('coerces PORT and rejects garbage', () => {
    expect(loadEnv({ ...valid, PORT: '5000' }).PORT).toBe(5000);
    expect(() => loadEnv({ ...valid, PORT: 'abc', NODE_ENV: 'staging' })).toThrow(
      /PORT[\s\S]*NODE_ENV|NODE_ENV[\s\S]*PORT/,
    );
  });
});
