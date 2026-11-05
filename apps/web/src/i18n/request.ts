import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * Interface texts (messages/<locale>.json) plus the landing and service page texts
 * (messages/site/<locale>.json). The site file has namespaces of its own (checked by a test).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [base, site] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/site/${locale}.json`),
  ]);
  return {
    locale,
    messages: { ...base.default, ...site.default },
  };
});
