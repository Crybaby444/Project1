/**
 * What is Yoyo is the one page with nothing around it (owner, 2026-11-16): no header, banners, tab bar or
 * footer; the way back home is at its very end. `isImmersive` names that page in any language.
 */
export function isImmersive(pathname: string): boolean {
  return /^(\/[a-z]{2})?\/what-is-yoyo\/?$/.test(pathname);
}
