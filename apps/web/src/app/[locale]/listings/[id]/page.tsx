import { splitListingParam, type AvailableItem, type CatalogItem, type CategoryNode, type Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs, type Crumb } from '@/components/catalog/Breadcrumbs';
import { HeartButton } from '@/components/catalog/HeartButton';
import { ListingCard } from '@/components/catalog/ListingCard';
import { BookingPanel } from '@/components/item/BookingPanel';
import { ContentLanguage } from '@/components/item/ContentLanguage';
import { Gallery } from '@/components/item/Gallery';
import { ItemFacts } from '@/components/item/ItemFacts';
import { OwnerCard } from '@/components/item/OwnerCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/Button';
import { categoryLink, categoryName, pathTo } from '@/lib/catalog/categories';
import { itemJsonLd } from '@/lib/catalog/item-json-ld';
import { loadCategories, loadItem, loadSearch } from '@/lib/catalog/server-api';
import { itemSeo, seoMetadata, siteOrigin } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; id: string }> };

/** Similar items: the first of the same category, this one left out. */
const SIMILAR = 4;

async function load(param: string) {
  const { id } = splitListingParam(decodeURIComponent(param));
  return loadItem(id);
}

async function similarTo(categorySlug: string | undefined, id: string): Promise<CatalogItem[]> {
  if (!categorySlug) return [];
  const found = await loadSearch({ page: 1, category: categorySlug });
  return found.ok ? found.data.items.filter((item) => item.id !== id).slice(0, SIMILAR) : [];
}

const shorten = (text: string, max = 160) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  const loaded = await load(id);
  if (!loaded.ok) return {};
  const t = await getTranslations({ locale, namespace: 'item' });
  const detail = loaded.data;
  const title = detail.listing.title ?? t('untitled');
  const seo = itemSeo(detail.listing, detail.available);
  if (!detail.available) return { title: `${title} · Yoyo`, ...seoMetadata(seo) };
  const description = detail.listing.description ? shorten(detail.listing.description) : t('metaDescription', { title });
  const cover = detail.listing.photos[0];
  return {
    title: `${title} · Yoyo`,
    description,
    ...seoMetadata(seo),
    openGraph: {
      type: 'website',
      siteName: 'Yoyo',
      url: seo.canonical,
      title,
      description,
      ...(cover ? { images: [{ url: cover.urls.card, width: 640, height: 480 }] } : {}),
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary', title, description },
  };
}

/**
 * An item's page, `/listings/{id}-{slug}` under every language (the proxy has already sent a wrong
 * slug to the right address, and answered 410 for a removed item). Its texts are in the item's own
 * language (`lang` on them, and on `<html>`), everything around them in the page's.
 */
export default async function ItemPage({ params }: Props) {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  setRequestLocale(locale);
  const loaded = await load(id);
  if (!loaded.ok) {
    if (loaded.status === 404) notFound();
    throw new Error(`The item could not be loaded (${loaded.status})`);
  }
  const t = await getTranslations('item');
  const tCatalog = await getTranslations('catalog');
  const tree = await loadCategories();
  const path = tree.ok ? pathTo(tree.data, loaded.data.listing.categoryId) : [];
  const category = path.at(-1);
  const detail = loaded.data;
  const title = detail.listing.title ?? t('untitled');
  const similar = await similarTo(category?.slug, detail.listing.id);
  const crumbs: Crumb[] = [
    { label: tCatalog('breadcrumbs.home'), href: '/' },
    { label: tCatalog('breadcrumbs.catalog'), href: '/c' },
    ...path.map((step) => ({ label: categoryName(step, locale), href: categoryLink(step, locale) })),
    { label: title },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pt-6 pb-28 sm:px-8 lg:pb-16">
      <ContentLanguage lang={detail.listing.contentLocale} />
      <Breadcrumbs items={crumbs} label={tCatalog('breadcrumbs.label')} />
      {detail.available ? (
        <Available item={detail} title={title} category={category} locale={locale} />
      ) : (
        <section className="border-ink/15 rounded-media bg-surface flex flex-col items-start gap-4 border border-dashed p-6 sm:p-10">
          <p className="bg-ink text-canvas rounded-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase before:size-1.5 before:rounded-full before:bg-[var(--glow)] before:content-['']">
            {t('away.badge')}
          </p>
          <h1 className="font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] font-black uppercase hyphens-auto [overflow-wrap:anywhere]" lang={detail.listing.contentLocale}>
            {title}
          </h1>
          <p className="max-w-[52ch] text-lg">{t('away.body')}</p>
          <Button variant="ghost" href={category ? categoryLink(category, locale) : '/c'}>
            {category ? t('away.category', { name: categoryName(category, locale) }) : t('away.catalog')}
          </Button>
        </section>
      )}
      {similar.length > 0 && (
        <section aria-labelledby="similar" className="flex flex-col gap-4">
          <h2 id="similar" className="font-display text-[clamp(1.8rem,3vw,2.8rem)] leading-[0.9] font-black uppercase">
            {t('similar')}
          </h2>
          <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => (
              <li key={item.id}>
                <ListingCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

async function Available({ item, title, category, locale }: { item: AvailableItem; title: string; category: CategoryNode | undefined; locale: Locale }) {
  const t = await getTranslations('item');
  const { listing, owner } = item;
  const seo = itemSeo(listing, true);
  return (
    <>
      <JsonLd data={itemJsonLd(item, siteOrigin(), seo.canonical)} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start xl:gap-12">
        <div className="flex min-w-0 flex-col gap-8">
          <Gallery listingId={listing.id} title={title} photos={listing.photos} />
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display min-w-0 text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] font-black uppercase hyphens-auto [overflow-wrap:anywhere]" lang={listing.contentLocale}>
              {title}
            </h1>
            <HeartButton listingId={listing.id} title={title} className="shrink-0" />
          </div>
          {category && (
            <p className="-mt-5 text-sm">
              {t.rich('inCategory', { name: categoryName(category, locale), b: (chunks) => <span className="font-bold">{chunks}</span> })}
            </p>
          )}
          {listing.description && (
            <section aria-labelledby="item-about" className="flex flex-col gap-3">
              <h2 id="item-about" className="font-display text-[clamp(1.8rem,3vw,2.8rem)] leading-[0.9] font-black uppercase">
                {t('about')}
              </h2>
              <p className="max-w-[68ch] text-lg leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]" lang={listing.contentLocale}>
                {listing.description}
              </p>
            </section>
          )}
          <ItemFacts listing={listing} attributes={category?.attributes ?? []} />
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          <BookingPanel item={item} />
          <OwnerCard owner={owner} />
        </aside>
      </div>
    </>
  );
}
