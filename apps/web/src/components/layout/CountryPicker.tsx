'use client';

import { COUNTRY_CODES, countryName, type Country } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { countryCookie } from '@/lib/country/country';

/**
 * The country the catalog shows (owner, 2026-11-16: the euro area, one country at a time; nobody in Riga
 * rents from Paris). A small pill with the code; a dialog with every country by its name in the page's
 * language. The choice is kept in a cookie and the page is drawn again in that country.
 */
export function CountryPicker({ country }: { country: Country }) {
  const t = useTranslations('country');
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const named = COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale));

  function choose(code: Country) {
    document.cookie = countryCookie(code);
    setOpen(false);
    start(() => router.refresh());
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('button', { name: countryName(country, locale) })}
        aria-busy={pending || undefined}
        data-country-picker=""
        className="border-ink/25 hover:border-ink rounded-pill inline-flex h-10 items-center gap-1.5 border px-3 text-[13px] font-bold transition-colors"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        {country}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('title')} wide>
        <p className="text-ink/75 mb-5 text-[15px] leading-relaxed">{t('lead')}</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {named.map(({ code, name }) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => choose(code)}
                aria-pressed={code === country}
                className={`rounded-media flex min-h-12 w-full items-center gap-2 border px-3 text-left text-[15px] font-semibold transition-colors ${
                  code === country ? 'bg-ink text-canvas border-ink' : 'border-ink/15 hover:border-ink'
                }`}
              >
                <span className="text-[12px] font-bold opacity-60 tabular-nums">{code}</span>
                {name}
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
