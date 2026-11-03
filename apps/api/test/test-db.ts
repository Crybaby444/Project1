/** Database used by the API tests. CI overrides it with TEST_DATABASE_URL. */
export const testDatabaseUrl = process.env['TEST_DATABASE_URL'] ?? 'postgresql://yoyo:yoyo@localhost:5432/yoyo_test';
