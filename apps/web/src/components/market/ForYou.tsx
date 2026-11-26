'use client';

import { useQuery } from '@tanstack/react-query';
import type { CatalogItem, Country, ForYouResponse } from '@yoyo/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { ListingCard } from '@/components/catalog/ListingCard';
import { recallViewed, RECENT_EVENT } from '@/lib/catalog/recently-viewed';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** The categories this browser looked at lately, most recent first. */
function viewedCategories(): string[] {
  return [...new Set(recallViewed().map((item: CatalogItem) => item.categoryId).filter((id): id is string => !!id))].slice(0, 12);
}

/**
 * The home's list (owner, 2026-11-16: "by interests or by popularity", not the raw newest). The server
 * renders "Popular now"; once the browser knows something about the person (signed in, or items looked
 * at), it asks for their own list and the heading becomes "For you".
 */
export function ForYou({
  initial,
  country,
  headingId,
  titles,
  action,
  children,
}: {
  initial: ForYouResponse;
  country: Country;
  headingId: string;
  titles: { personal: string; popular: string };
  action?: ReactNode;
  children?: ReactNode;
}) {
  const client = useApiClient();
  const { status } = useSession();
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    const read = () => setCategories(viewedCategories());
    read();
    window.addEventListener(RECENT_EVENT, read);
    return () => window.removeEventListener(RECENT_EVENT, read);
  }, []);
  const signedIn = status === 'authenticated';
  const personal = useQuery({
    queryKey: ['for-you', country, signedIn, categories],
    enabled: signedIn || categories.length > 0,
    staleTime: 60_000,
    queryFn: () =>
      signedIn
        ? unwrap(client.GET('/api/v1/me/for-you', { params: { query: { country, ...(categories.length && { categories: categories.join(',') }) } as never } }))
        : unwrap(client.GET('/api/v1/catalog/for-you', { params: { query: { country, categories: categories.join(',') } as never } })),
  });
  const data = personal.data && personal.data.items.length > 0 ? personal.data : initial;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id={headingId} className="type-title">
          {data.personal ? titles.personal : titles.popular}
        </h2>
        {action}
      </div>
      <ul className="grid-cards">
        {data.items.slice(0, 8).map((item, i) => (
          <li key={item.id}>
            <ListingCard item={item} eager={i < 4} />
          </li>
        ))}
        {children}
      </ul>
    </>
  );
}
