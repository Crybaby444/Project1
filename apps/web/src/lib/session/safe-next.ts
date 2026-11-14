import { safeSitePath } from '@yoyo/shared';

/**
 * Where to go after signing in (`?next=`): only a path on this site, everything else becomes `/`.
 * The same rule as the API's Google `returnTo` (safeSitePath in @yoyo/shared).
 */
export function safeNext(value: string | null | undefined): string {
  return safeSitePath(value);
}

/**
 * Where a person lands after signing in: `next` when it names a page, otherwise the home page, or the
 * admin panel for an administrator (owner, 2026-11-14: "signing in as admin opens the admin panel").
 */
export function afterSignIn(role: string, next: string | null | undefined): string {
  const target = safeNext(next);
  return target === '/' && role === 'ADMIN' ? '/admin' : target;
}
