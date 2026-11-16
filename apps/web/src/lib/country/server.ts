import type { Country } from '@yoyo/shared';
import { cookies, headers } from 'next/headers';
import { COUNTRY_COOKIE, pickCountry } from './country';

/** The visitor's country on the server (their cookie, else Vercel's IP country header). */
export async function currentCountry(): Promise<Country> {
  const [jar, head] = await Promise.all([cookies(), headers()]);
  return pickCountry(jar.get(COUNTRY_COOKIE)?.value, head.get('x-vercel-ip-country'));
}
