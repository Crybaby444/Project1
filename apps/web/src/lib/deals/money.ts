'use client';

import { cents, formatMoney } from '@yoyo/domain';
import type { Locale } from '@yoyo/shared';
import { useLocale } from 'next-intl';
import { useCallback } from 'react';

/** Whole cents as the page language writes money: "€1,234.50" in English, "1 234,50 €" in Latvian and Russian. */
export function money(amountCents: number, locale: string): string {
  const sign = amountCents < 0 ? '−' : '';
  return `${sign}${formatMoney(cents(Math.abs(amountCents)), locale as Locale)}`.replace(/[  ]/g, ' ');
}

export function useMoney(): (amountCents: number) => string {
  const locale = useLocale();
  return useCallback((amountCents: number) => money(amountCents, locale), [locale]);
}
