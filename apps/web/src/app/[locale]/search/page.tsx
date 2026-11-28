import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatalogResults } from '@/components/catalog/CatalogResults';
import { PeopleResults } from '@/components/people/PeopleResults';
import { parseCatalogParams } from '@/lib/catalog/params';
import { loadPeople } from '@/lib/catalog/server-api';
import { searchSeo, seoMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const query = parseCatalogParams(await searchParams);
  return {
    title: `${query.q ? t('searchTitleFor', { q: query.q }) : t('searchTitle')} · Yoyo`,
    ...seoMetadata(searchSeo(locale, query)),
  };
}

/** Search across the whole catalog (`/search?q=`, W03: never indexed, links followed). */
export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations('catalog');
  const query = parseCatalogParams(await searchParams);
  // People by name or @username too (owner, 2026-11-28: the profile's "find people" moved into the search).
  // Asked now and awaited where it is drawn, so it runs beside the catalog's own requests.
  const words = query.q?.trim().replace(/^@/, '') ?? '';
  const people = words.length >= 2 ? loadPeople(query.q!.trim()) : null;
  return (
    <CatalogResults
      locale={locale}
      params={query}
      category={null}
      path="/search"
      title={query.q ? t('searchTitleFor', { q: query.q }) : t('searchTitle')}
      related={[]}
      crumbs={[
        { label: t('breadcrumbs.home'), href: '/' },
        { label: t('breadcrumbs.catalog'), href: '/c' },
        { label: t('breadcrumbs.search') },
      ]}
      people={people ? <PeopleResults found={people} /> : null}
    />
  );
}
