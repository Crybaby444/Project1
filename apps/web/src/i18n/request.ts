import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * Interface texts (messages/<locale>.json) plus the landing and service page texts
 * (messages/site/<locale>.json), the deal and wallet screens (messages/deals/<locale>.json) and the admin
 * panel (messages/admin/<locale>.json). Each file
 * has namespaces of its own (checked by a test), so branches editing one never collide in another.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [base, site, deals, admin] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/site/${locale}.json`),
    import(`../../messages/deals/${locale}.json`),
    import(`../../messages/admin/${locale}.json`),
  ]);
  return {
    locale,
    messages: { ...base.default, ...site.default, ...deals.default, ...admin.default },
    // Dates formatted through next-intl (an identity check's day, the admin's lists) read in the market's
    // time, the same on the server and in any browser; a deal's own moments use its zone (lib/deals/dates).
    timeZone: 'Europe/Riga',
  };
});
