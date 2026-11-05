import { safeSitePath } from '@yoyo/shared';

/**
 * Where to go after signing in (`?next=`): only a path on this site, everything else becomes `/`.
 * The same rule as the API's Google `returnTo` (safeSitePath in @yoyo/shared).
 */
export function safeNext(value: string | null | undefined): string {
  return safeSitePath(value);
}
