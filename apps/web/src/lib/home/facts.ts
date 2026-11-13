import type { BookingSettings } from '@yoyo/domain';
import { LOCALES } from '@yoyo/shared';

export type HomeFact = {
  value: number;
  unit: '%' | 'h' | '';
  /** Message key under `landing.facts`. */
  key: 'fee' | 'inspection' | 'contract' | 'checked' | 'languages';
  /** For the fee: the percent after the launch offer, shown in its line. */
  after?: number;
};

/**
 * The five facts of the home page's "How Yoyo keeps it fair" slide, read from the booking rules so the
 * page never says a number the deals do not keep. 100 % of listings are checked by a person (every
 * listing goes through moderation); one contract per deal; the languages are the site's own.
 */
export function homeFacts(s: BookingSettings): HomeFact[] {
  return [
    { value: s.promoServicePercent, unit: '%', key: 'fee', after: s.servicePercent },
    { value: s.inspectionHours, unit: 'h', key: 'inspection' },
    { value: 1, unit: '', key: 'contract' },
    { value: 100, unit: '%', key: 'checked' },
    { value: LOCALES.length, unit: '', key: 'languages' },
  ];
}
