/**
 * Pages with nothing of the site around them: What is Yoyo (owner, 2026-11-16: no header, banners, tab
 * bar or footer; the way back home is at its very end) and the admin panel, a tool with its own frame
 * (owner, 2026-11-16: the site's header spacer left an empty band above it). In any language.
 */
export function isImmersive(pathname: string): boolean {
  return /^(\/[a-z]{2})?\/what-is-yoyo\/?$/.test(pathname) || /^(\/[a-z]{2})?\/admin(\/|$)/.test(pathname);
}
