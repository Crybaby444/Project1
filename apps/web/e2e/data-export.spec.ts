import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import { registerByApi } from './support/accounts';

test('Settings → Security downloads all my data as one JSON file (GDPR)', async ({ page }) => {
  const { email, name } = await registerByApi(page.request, { name: 'Dana Data' });
  await page.goto('/settings/security');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: en.settings.security.data.download }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^yoyo-data-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(data.profile).toMatchObject({ email, name });
  expect(JSON.stringify(data)).not.toMatch(/passwordHash|tokenHash/);
});
