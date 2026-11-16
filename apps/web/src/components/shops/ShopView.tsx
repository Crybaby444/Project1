'use client';

import { useTranslations } from 'next-intl';
import { ListingCard } from '@/components/catalog/ListingCard';
import { MessageOwnerButton } from '@/components/chat/MessageOwnerButton';
import { FollowButton } from '@/components/people/FollowButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from '@/i18n/navigation';
import { useShop } from '@/lib/shops/queries';

/** A shop's page: its name and words, whose it is (follow, write), and its items. */
export function ShopView({ id }: { id: string }) {
  const t = useTranslations('shops');
  const shop = useShop(id);
  if (shop.isPending) return <div aria-busy="true" className="bg-mist rounded-media h-96" />;
  if (shop.isError || !shop.data) return <EmptyState title={t('notFound')} />;
  const { shop: s, owner, items } = shop.data;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link href={`/u/${owner.id}`} className="text-[15px] font-bold underline-offset-4 hover:underline">
          {owner.name}
          {owner.username && owner.name !== `@${owner.username}` && <span className="text-ink/70 font-semibold"> · @{owner.username}</span>}
        </Link>
        <h1 className="font-display text-[clamp(2.8rem,7vw,5.2rem)] leading-[0.9] font-black uppercase [overflow-wrap:anywhere]">{s.name}</h1>
        {s.about && <p className="max-w-[68ch] text-lg leading-relaxed whitespace-pre-line">{s.about}</p>}
        <div className="flex flex-wrap gap-3">
          <FollowButton userId={owner.id} name={owner.name} />
          <MessageOwnerButton ownerId={owner.id} label={t('write')} size="md" />
        </div>
      </header>
      {items.length === 0 ? (
        <EmptyState headingLevel={2} title={t('emptyShop')} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-4">
          {items.map((item, i) => (
            <li key={item.id}>
              <ListingCard item={item} eager={i < 4} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
