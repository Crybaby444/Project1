import type { CookieOptions, Response } from 'express';
import { ACCESS_TOKEN_TTL_SECONDS } from './access-token.service';
import { REFRESH_TOKEN_TTL_MS } from './refresh-token.service';

export const ACCESS_COOKIE = 'yoyo_at';
export const REFRESH_COOKIE = 'yoyo_rt';
/** The refresh token only travels to the endpoints that use it (refresh, logout). */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** HttpOnly + SameSite=Lax first-party cookies; Secure in production (https only). */
function base(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure };
}

export function setAuthCookies(res: Response, tokens: SessionTokens, secure: boolean): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base(secure), path: '/', maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000 });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(secure),
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

/** Max-Age=0 on both cookies, with the same paths they were set with, so the browser drops them. */
export function clearAuthCookies(res: Response, secure: boolean): void {
  res.cookie(ACCESS_COOKIE, '', { ...base(secure), path: '/', maxAge: 0 });
  res.cookie(REFRESH_COOKIE, '', { ...base(secure), path: REFRESH_COOKIE_PATH, maxAge: 0 });
}
