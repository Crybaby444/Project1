import Script from 'next/script';
import { CONSENT_COOKIE } from '@/lib/analytics/consent';

/** A GA4 measurement id ("G-…"), or null: nothing else ever reaches the page's script. */
export function validGaId(id: string | undefined): string | null {
  return id && /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
}

/**
 * The gtag bootstrap in Consent Mode v2: everything denied by default (advertising always), analytics
 * granted only if the visitor already agreed (the consent cookie). Must run before gtag.js.
 */
export function analyticsScript(id: string): string {
  return (
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;' +
    `var c=(document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/)||[])[1];` +
    "gtag('consent','default',{analytics_storage:c==='granted'?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});" +
    `gtag('js',new Date());gtag('config','${id}');`
  );
}

/**
 * Google Analytics 4 (owner decision), only when NEXT_PUBLIC_GA_ID is set; nothing is measured before
 * the visitor agrees in the ConsentBanner. GA4's enhanced measurement counts client-side page changes.
 */
export function Analytics({ gaId }: { gaId: string | undefined }) {
  const id = validGaId(gaId);
  if (!id) return null;
  return (
    <>
      <Script id="ga-consent" strategy="afterInteractive">
        {analyticsScript(id)}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
    </>
  );
}
