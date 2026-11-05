import type { ErrorCode } from './errors';

/**
 * Not a secret and not proof of anything: the API sets it (readable by scripts) next to the session
 * cookies and clears it with them, so the site's pages only ask GET /me when a session may exist.
 */
export const SESSION_HINT_COOKIE = 'yoyo_session';

/** Codes the API's Google callback sends back to the site's sign-in page in `?oauthError=`. */
export const OAUTH_ERROR_CODES = [
  'OAUTH_CANCELLED',
  'OAUTH_STATE_INVALID',
  'OAUTH_FAILED',
  'AUTH_BLOCKED',
] as const satisfies readonly ErrorCode[];

export type OAuthErrorCode = (typeof OAUTH_ERROR_CODES)[number];

export function isOAuthErrorCode(value: string | null | undefined): value is OAuthErrorCode {
  return (OAUTH_ERROR_CODES as readonly string[]).includes(value ?? '');
}

/**
 * Where to send a person after signing in: only a path on the site (`/…`), never `//host`, `/\host`,
 * a full URL, a `javascript:` link or anything with control characters. Everything else is `/`.
 * The site (`?next=`) and the API (Google `returnTo`) use this one rule.
 */
export function safeSitePath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  // eslint-disable-next-line no-control-regex -- control characters are exactly what is refused
  if (/[\u0000-\u001f\u007f]/.test(value)) return '/';
  return value;
}
