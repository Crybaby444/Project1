'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryNode, Locale, SavedSearch } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { categoryLink, categoryName } from '@/lib/catalog/categories';
import { useCategories } from '@/lib/listings/queries';
import { formatEuros } from '@/lib/listings/money';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

const KEY = ['notifications', 'saved-searches'] as const;

function flat(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flat(n.children)]);
}

/**
 * My saved searches (owner, 2026-11-15): each in words, a link back to that search, and a way to stop
 * it. New items that match ring the bell.
 */
export function SavedSearches() {
  const t = useTranslations('notifications.searches');
  const locale = useLocale() as Locale;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { status } = useSession();
  const categories = useCategories();
  const searches = useQuery({
    queryKey: KEY,
    queryFn: async () => (await unwrap(client.GET('/api/v1/me/saved-searches'))).items,
    enabled: status === 'authenticated',
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await unwrap(client.DELETE('/api/v1/me/saved-searches/{id}', { params: { path: { id } } }));
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const nodes = flat(categories.data ?? []);

  const describe = (s: SavedSearch) => {
    const node = s.category ? nodes.find((n) => n.slug === s.category) : undefined;
    const parts = [
      s.q ? `“${s.q}”` : null,
      node ? categoryName(node, locale) : null,
      s.priceMax !== null ? t('upTo', { price: formatEuros(s.priceMax, locale) }) : null,
      s.district ?? null,
      s.city ? s.city.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null,
    ].filter(Boolean);
    const params = new URLSearchParams();
    if (s.q) params.set('q', s.q);
    if (s.priceMax !== null) params.set('price_max', String(Math.round(s.priceMax / 100)));
    if (s.district) params.set('district', s.district);
    if (s.city) params.set('city', s.city);
    const base = node ? categoryLink(node, locale) : '/search';
    const query = params.toString();
    return { text: parts.join(' · '), href: query ? `${base}?${query}` : base };
  };

  if (searches.isPending || searches.isError) return null;
  return (
    <section aria-labelledby="saved-searches" className="flex flex-col gap-3">
      <h2 id="saved-searches" className="font-display text-display-s leading-none font-black uppercase">
        {t('title')}
      </h2>
      {searches.data.length === 0 ? (
        <p className="text-ink/75 text-sm">{t('empty')}</p>
      ) : (
        <ul aria-label={t('title')} className="divide-ink/10 border-ink/15 divide-y border-y">
          {searches.data.map((s) => {
            const { text, href } = describe(s);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={href} className="min-w-0 truncate font-semibold hover:underline hover:decoration-1 hover:underline-offset-2">
                  {text}
                </Link>
                <button
                  type="button"
                  aria-label={t('remove')}
                  title={t('remove')}
                  onClick={() => remove.mutate(s.id)}
                  disabled={remove.isPending}
                  className="border-ink/30 hover:border-ink rounded-pill inline-grid size-9 shrink-0 place-items-center border"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-width:2]">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
