import type { CatalogQuery, Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { CategoryIndex } from '@/components/catalog/CategoryIndex';
import { SearchBox } from '@/components/catalog/SearchBox';
import { ListingCard } from '@/components/catalog/ListingCard';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { loadCategories, loadCategoryCounts, loadSearch } from '@/lib/catalog/server-api';
import { displayFit } from '@/lib/display-fit';
import { Link } from '@/i18n/navigation';
import { localePath, seoMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: 'catalog' });
  return {
    title: `${t('allTitle')} · Yoyo`,
    description: t('allDescription'),
    ...seoMetadata({ canonical: localePath(locale, '/c'), robots: { index: true, follow: true } }),
  };
}

/** All categories (`/c`, W03 CATS): every root with its subcategories, as plain links. */
export default async function CategoriesPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations('catalog');
  const [tree, counts, newest] = await Promise.all([loadCategories(), loadCategoryCounts(), loadSearch({ sort: 'new', page: 1 } as CatalogQuery)]);
  const fresh = newest.ok ? newest.data.items.slice(0, 4) : [];
  const title = t('allTitle');
  return (
    <main className="@container mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
      <Breadcrumbs items={[{ label: t('breadcrumbs.home'), href: '/' }, { label: t('breadcrumbs.catalog') }]} label={t('breadcrumbs.label')} />
      <div className="flex flex-col gap-4">
        <h1 style={displayFit(title, { min: '2rem', max: '4rem' })} className="font-display text-display-fit leading-[0.9] font-black uppercase">
          {title}
        </h1>
        <SearchBox className="max-w-3xl" />
      </div>
      {!tree.ok ? (
        <p role="alert" className="font-bold">
          {t('error.body')}
        </p>
      ) : (
        <>
          <RecentlyViewed />
          {fresh.length > 0 && (
            <section aria-labelledby="catalog-fresh" className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="catalog-fresh" className="font-display text-display-s leading-none font-black uppercase">
                  {t('fresh')}
                </h2>
                <Link href="/search?sort=new" className="text-sm font-bold underline decoration-1 underline-offset-4">
                  {t('freshAll')}
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-4">
                {fresh.map((item, i) => (
                  <li key={item.id}>
                    <ListingCard item={item} eager={i < 2} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="catalog-all" className="flex flex-col gap-4">
            <h2 id="catalog-all" className="font-display text-display-s leading-none font-black uppercase">
              {t('allCategories')}
            </h2>
            <CategoryIndex roots={tree.data} locale={locale} counts={counts} />
          </section>
        </>
      )}
    </main>
  );
}
