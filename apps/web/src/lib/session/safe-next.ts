/**
 * Where to go after signing in: only a path on this site (`/…`), never `//host`, `/\host`, a full URL,
 * a `javascript:` link or anything with control characters. Everything else becomes `/`.
 * The same rule as the API's `returnTo` for Google sign-in.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  if (/[\u0000-\u001f\u007f]/.test(value)) return '/';
  return value;
}
