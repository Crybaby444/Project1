import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatalogResults } from '@/components/catalog/CatalogResults';
import { redirect } from '@/i18n/navigation';
import { categoryLink, categoryName, findBySlug, pathTo } from '@/lib/catalog/categories';
import { catalogSearch, parseCatalogParams } from '@/lib/catalog/params';
import { loadCategories, loadSearch } from '@/lib/catalog/server-api';
import { categorySeo, seoMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolve(locale: Locale, slug: string) {
  const tree = await loadCategories();
  if (!tree.ok) return null;
  const found = findBySlug(tree.data, locale, decodeURIComponent(slug));
  return found ? { ...found, tree: tree.data } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const found = await resolve(locale, slug);
  if (!found) return {};
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const name = categoryName(found.node, locale);
  // The rule counts what the category holds, whatever the filters (W03 §G: ≥ 3 active listings).
  const all = await loadSearch({ page: 1, category: found.node.slug });
  const count = all.ok ? all.data.total : 0;
  return {
    title: `${t('categoryTitle', { name })} · Yoyo`,
    description: t('categoryDescription', { name }),
    ...seoMetadata(categorySeo({ slug: found.node.slugs[locale], locale, count, params: parseCatalogParams(await searchParams) })),
  };
}

/** A category or subcategory: `/c/{slug}` with the slug of the page's language (W03 §D). */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  setRequestLocale(locale);
  const found = await resolve(locale, slug);
  if (!found) notFound();
  const query = parseCatalogParams(await searchParams);
  if (!found.exact) redirect({ href: `${categoryLink(found.node, locale)}${catalogSearch(query)}`, locale });
  const t = await getTranslations('catalog');
  const { node, tree } = found;
  const path = pathTo(tree, node.slug);
  const parent = path.length > 1 ? path[path.length - 2]! : null;
  const relatedNodes = node.children.length > 0 ? node.children : (parent?.children ?? []);
  return (
    <CatalogResults
      locale={locale}
      params={query}
      category={node}
      path={categoryLink(node, locale)}
      title={categoryName(node, locale)}
      related={relatedNodes.map((other) => ({ label: categoryName(other, locale), href: categoryLink(other, locale), current: other.id === node.id }))}
      crumbs={[
        { label: t('breadcrumbs.home'), href: '/' },
        { label: t('breadcrumbs.catalog'), href: '/c' },
        ...path.map((step) => ({ label: categoryName(step, locale), href: categoryLink(step, locale) })),
      ]}
    />
  );
}
