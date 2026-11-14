'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { CONSENT_EVENT, consentCookie, readConsent, type Consent } from '@/lib/analytics/consent';

type Gtag = (...args: unknown[]) => void;

/** Tells Google Analytics (Consent Mode) the visitor's choice; a no-op before gtag loads. */
export function applyConsent(choice: Consent): void {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (choice === 'granted') gtag?.('consent', 'update', { analytics_storage: 'granted' });
  else gtag?.('consent', 'update', { analytics_storage: 'denied' });
}

/**
 * The cookie question (v16: the ink capsule at the bottom, like the language bar): asked once, only
 * while analytics is on (a measurement id); Accept and Decline are equally easy. The footer's "Cookie
 * settings" forgets the answer and asks again (CONSENT_EVENT).
 */
export function ConsentBanner({ gaId }: { gaId: string }) {
  const t = useTranslations('consent');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!gaId) return;
    const check = () => setOpen(readConsent(document.cookie) === null);
    check();
    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, [gaId]);

  if (!gaId || !open) return null;

  function choose(choice: Consent) {
    document.cookie = consentCookie(choice);
    applyConsent(choice);
    setOpen(false);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  return (
    <section
      aria-label={t('label')}
      data-consent-banner=""
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="bg-ink text-canvas animate-toast-in pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-x-5 gap-y-3 rounded-[28px] py-3 pr-3 pl-5 shadow-[0_24px_48px_-24px_rgba(10,11,14,0.55)] sm:rounded-full">
        <p className="m-0 min-w-0 flex-[1_1_16rem] text-[14px] leading-snug font-semibold">
          {t('text')}{' '}
          <Link href="/cookies" className="underline underline-offset-4">
            {t('policy')}
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => choose('denied')}
            className="text-canvas rounded-pill border-canvas/40 hover:border-canvas inline-flex min-h-10 items-center border px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-colors duration-150"
          >
            {t('decline')}
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="bg-canvas text-ink rounded-pill inline-flex min-h-10 items-center px-5 text-[13px] font-bold tracking-[0.03em] uppercase"
          >
            {t('accept')}
          </button>
        </div>
      </div>
    </section>
  );
}

/** Footer: forget the cookie answer, so the question comes back. Only while analytics is on. */
export function CookieSettingsButton({ gaId, className = '' }: { gaId: string; className?: string }) {
  const t = useTranslations('consent');
  if (!gaId) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        document.cookie = consentCookie(null);
        applyConsent('denied');
        window.dispatchEvent(new Event(CONSENT_EVENT));
      }}
    >
      {t('settings')}
    </button>
  );
}
