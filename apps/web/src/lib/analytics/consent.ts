/**
 * Consent for analytics (Google Analytics 4 in Consent Mode; owner decision, HITEXIS P00). Nothing is
 * measured until the visitor agrees; the choice lives in a first-party cookie for a year and can be
 * withdrawn from the footer ("Cookie settings"). Off entirely while NEXT_PUBLIC_GA_ID is not set.
 */
export const CONSENT_COOKIE = 'yoyo-consent';
export type Consent = 'granted' | 'denied';
export const CONSENT_EVENT = 'yoyo:consent';

/** The GA4 measurement id, or '' when analytics is off. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';

export function readConsent(cookies: string): Consent | null {
  const value = cookies.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))?.[1];
  return value === 'granted' || value === 'denied' ? value : null;
}

/** The Set-Cookie text for a choice (a year), or for forgetting it (null). */
export function consentCookie(value: Consent | null): string {
  return value
    ? `${CONSENT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
    : `${CONSENT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
