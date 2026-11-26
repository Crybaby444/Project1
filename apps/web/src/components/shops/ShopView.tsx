'use client';

import { useTranslations } from 'next-intl';
import { ListingCard } from '@/components/catalog/ListingCard';
import { MessageOwnerButton } from '@/components/chat/MessageOwnerButton';
import { FollowButton } from '@/components/people/FollowButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
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
    <div className="stack-page">
      <PageHeader
        title={s.name}
        count={items.length}
        crumbs={
          <Link href={`/u/${owner.id}`} className="self-start text-base font-bold underline-offset-4 hover:underline">
            {owner.name}
            {owner.username && owner.name !== `@${owner.username}` && <span className="text-ink/70 font-semibold"> · @{owner.username}</span>}
          </Link>
        }
        intro={s.about ? <span className="whitespace-pre-line">{s.about}</span> : undefined}
        action={
          <>
            <FollowButton userId={owner.id} name={owner.name} />
            <MessageOwnerButton ownerId={owner.id} label={t('write')} size="md" />
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState headingLevel={2} title={t('emptyShop')} />
      ) : (
        <ul className="grid-cards">
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
