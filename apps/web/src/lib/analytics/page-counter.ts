import type { AnalyticsHit } from '@yoyo/shared';

/**
 * The page view the site's own counter sends (cookieless; nothing about the person): the first page of
 * a visit is an entry with the site it came from (never our own); later pages are plain views.
 */
export function hitFor(input: {
  path: string;
  first: boolean;
  referrer: string;
  origin: string;
  locale: string;
  search?: { q: string; results: number };
}): AnalyticsHit {
  let referrer = '';
  let ours = false;
  if (input.first && input.referrer) {
    try {
      ours = new URL(input.referrer).origin === input.origin;
      if (!ours) referrer = input.referrer.slice(0, 500);
    } catch {
      referrer = '';
    }
  }
  return {
    path: input.path.slice(0, 300),
    // A full reload or a link from our own pages is not a new visit.
    entry: input.first && !ours,
    referrer,
    locale: input.locale,
    ...(input.search && { search: input.search }),
  };
}
