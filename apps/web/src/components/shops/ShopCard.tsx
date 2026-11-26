'use client';

import type { ShopSummary } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useUserShops } from '@/lib/shops/queries';
import type { ReactNode } from 'react';

/** A shop as a card: up to three item photos, the name and how many items. */
export function ShopCard({ shop }: { shop: ShopSummary }) {
  const t = useTranslations('shops');
  return (
    <Link href={`/shops/${shop.id}`} className="group sheet border-ink/15 rounded-media flex flex-col overflow-hidden border" data-shop={shop.id}>
      <div className="bg-mist grid aspect-[3/2] grid-cols-3 gap-0.5">
        {[0, 1, 2].map((i) =>
          shop.covers[i] ? (
            // eslint-disable-next-line @next/next/no-img-element -- small thumbnails from the photo store
            <img key={i} src={shop.covers[i]} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <span key={i} className="bg-ink/[0.05]" />
          ),
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span className="font-display text-3xl leading-none font-black uppercase [overflow-wrap:anywhere]">{shop.name}</span>
        <span className="text-ink/70 text-sm font-semibold">{t('itemCount', { count: shop.itemCount })}</span>
        {shop.about && <span className="text-ink/80 line-clamp-2 text-sm">{shop.about}</span>}
      </div>
    </Link>
  );
}

/** A person's shops on their profile. */
export function ShopsGrid({ userId, empty }: { userId: string; empty: ReactNode }) {
  const shops = useUserShops(userId);
  if (shops.isPending) return <div aria-busy="true" className="bg-mist rounded-media h-48" />;
  if (!shops.data || shops.data.length === 0) return <>{empty}</>;
  return (
    <ul className="grid-tiles">
      {shops.data.map((s) => (
        <li key={s.id}>
          <ShopCard shop={s} />
        </li>
      ))}
    </ul>
  );
}
