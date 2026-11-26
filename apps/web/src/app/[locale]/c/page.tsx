import type { CatalogQuery, Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { CategoryIndex } from '@/components/catalog/CategoryIndex';
import { SearchBox } from '@/components/catalog/SearchBox';
import { ListingCard } from '@/components/catalog/ListingCard';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { loadCategories, loadCategoryCounts, loadSearch } from '@/lib/catalog/server-api';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Section';
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

/**
 * The catalog (`/c`): every category first (that is what people come here for), then what is new,
 * then what this visitor looked at last.
 */
export default async function CategoriesPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations('catalog');
  const [tree, counts, newest] = await Promise.all([loadCategories(), loadCategoryCounts(), loadSearch({ sort: 'new', page: 1 } as CatalogQuery)]);
  const fresh = newest.ok ? newest.data.items.slice(0, 4) : [];
  const title = t('allTitle');
  return (
    <main className="page page-y stack-page">
      <PageHeader
        title={title}
        crumbs={<Breadcrumbs items={[{ label: t('breadcrumbs.home'), href: '/' }, { label: t('breadcrumbs.catalog') }]} label={t('breadcrumbs.label')} />}
      >
        <SearchBox className="max-w-3xl" />
      </PageHeader>
      {!tree.ok ? (
        <p role="alert" className="font-bold">
          {t('error.body')}
        </p>
      ) : (
        <>
          <Section title={t('allCategories')} id="catalog-all">
            <CategoryIndex roots={tree.data} locale={locale} counts={counts} />
          </Section>
          {fresh.length > 0 && (
            <Section
              title={t('fresh')}
              id="catalog-fresh"
              action={
                <Link href="/search?sort=new" className="text-sm font-bold underline decoration-1 underline-offset-4">
                  {t('freshAll')}
                </Link>
              }
            >
              <ul className="grid-cards">
                {fresh.map((item, i) => (
                  <li key={item.id}>
                    <ListingCard item={item} eager={i < 2} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <RecentlyViewed />
        </>
      )}
    </main>
  );
}
