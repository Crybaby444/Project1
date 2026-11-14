'use client';

import { LOCALES, type BookingView, type Locale } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatMoment } from '@/lib/deals/dates';
import { useErrorText } from '@/lib/forms/error-text';
import { toApiError } from '@/lib/session/api-error';
import { fetchWithRefresh } from '@/lib/session/fetch-with-refresh';

/**
 * Downloads the contract PDF through the site's /api proxy with the session renewed if needed (a plain
 * link would fail once the 15-minute access token has expired), and saves it under the API's name.
 */
export async function downloadContract(bookingId: string, lang: Locale, fetcher: typeof fetch = fetchWithRefresh): Promise<void> {
  const response = await fetcher(`/api/v1/bookings/${encodeURIComponent(bookingId)}/contract.pdf?lang=${lang}`);
  if (!response.ok) throw toApiError(response, await response.json().catch(() => undefined));
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `yoyo-contract-${bookingId}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function Signature({ who, at, timeZone }: { who: string; at: string | null; timeZone: string }) {
  const t = useTranslations('deal.contract');
  const locale = useLocale();
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        data-signed={at ? '' : undefined}
        className={`grid size-9 shrink-0 place-items-center rounded-full border ${at ? 'bg-ink text-canvas animate-stamp border-ink/15' : 'border-ink/40 border-dashed'}`}
      >
        {at && (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 12.5 4 4L18 8.5" />
          </svg>
        )}
      </span>
      <p className="flex flex-col">
        <span className="text-[13px] font-bold tracking-[0.03em] uppercase">{who}</span>
        <span className="text-sm">{at ? t('signed', { when: formatMoment(at, locale, timeZone) }) : t('notSigned')}</span>
      </p>
    </div>
  );
}

/**
 * The rental contract: what it fixes, who has signed and when, and the PDF in EN, LV or RU (the page
 * language by default). The SIGN button itself is one of the deal's actions.
 */
export function ContractCard({ booking }: { booking: BookingView }) {
  const t = useTranslations('deal.contract');
  const tl = useTranslations('language');
  const locale = useLocale() as Locale;
  const errorText = useErrorText();
  const [lang, setLang] = useState<Locale>(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectId = useId();

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadContract(booking.id, lang);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="deal-contract" className="border-ink/15 flex flex-col gap-4 border-t pt-6" data-contract="">
      <div className="flex flex-col gap-1">
        <h2 id="deal-contract" className="font-display text-[2rem] leading-[0.95] font-black uppercase">
          {t('title')}
        </h2>
        <p className="text-sm">{booking.hasContract ? t('body') : t('notYet')}</p>
      </div>
      {booking.hasContract && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Signature who={t('renter')} at={booking.renterSignedAt} timeZone={booking.timeZone} />
            <Signature who={t('owner')} at={booking.ownerSignedAt} timeZone={booking.timeZone} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={selectId} className="text-[13px] font-bold tracking-[0.03em] uppercase">
                {t('language')}
              </label>
              <select
                id={selectId}
                value={lang}
                onChange={(event) => setLang(event.target.value as Locale)}
                className="rounded-pill border-ink bg-surface min-h-10 border px-4 text-sm font-bold"
              >
                {LOCALES.map((code) => (
                  <option key={code} value={code}>
                    {tl(code)}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="ghost" onClick={() => void download()} loading={busy} data-download-contract="">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 20h14" />
              </svg>
              {t('download')}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm font-bold">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
