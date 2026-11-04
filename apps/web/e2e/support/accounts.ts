import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';

export const PASSWORD = 'correct horse battery';

/** A new address nobody has used, so tests never share an account. */
export function uniqueEmail(tag = 'e2e'): string {
  return `${tag}-${Date.now()}-${Math.round(Math.random() * 1e9)}@mail.lv`;
}

/**
 * Makes this browser look like its own visitor to the API (X-Forwarded-For, trusted because the site
 * proxy adds the shared PROXY_SECRET), so the per-address limits on registration and sign-in do not
 * add up across tests running in parallel.
 */
export async function asOwnVisitor(context: BrowserContext): Promise<void> {
  const octet = () => 1 + Math.floor(Math.random() * 250);
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `203.0.${octet()}.${octet()}, 192.0.2.1` });
}

/** Registers through the site's /api proxy; the browser of `request` is signed in afterwards. */
export async function registerByApi(
  request: APIRequestContext,
  { email = uniqueEmail(), password = PASSWORD, name = 'Anna Bērziņa', locale = 'en' } = {},
): Promise<{ email: string; password: string; name: string }> {
  const res = await request.post('/api/v1/auth/register', { data: { email, password, name, locale } });
  if (res.status() !== 201) throw new Error(`registration failed: ${res.status()} ${await res.text()}`);
  return { email, password, name };
}

/** Fills and sends the sign-in form. */
export async function signInWithForm(page: Page, email: string, password: string, submitLabel: string) {
  await page.getByLabel(/^(Email|E-pasts|Почта)$/).fill(email);
  await page.getByLabel(/^(Password|Parole|Пароль)$/, { exact: true }).fill(password);
  await page.getByRole('button', { name: submitLabel }).click();
}

/** The form-level error (FormError), not Next's own route announcer, which is also an alert. */
export function formError(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}
