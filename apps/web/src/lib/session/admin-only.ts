/**
 * Owner, 2026-11-15: an administrator's account is for the admin panel only. It may stay in the panel
 * and on the pages the panel links to for checks (an item, a deal, a profile), the legal texts and the
 * password settings; everything made for renters and owners sends it back to /admin.
 */
const STAY = [
  /^\/admin(\/|$)/,
  /^\/listings\/(?!new(\/|$))[^/]+$/,
  /^\/bookings\/[^/]+$/,
  /^\/u\/[^/]+$/,
  /^\/(terms|privacy|cookies)$/,
  /^\/settings\/security$/,
];

export function adminMayStay(pathname: string): boolean {
  return STAY.some((rule) => rule.test(pathname));
}
