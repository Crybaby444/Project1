import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { CategoryIndex } from '@/components/catalog/CategoryIndex';
import { SearchBox } from '@/components/catalog/SearchBox';
import { loadCategories } from '@/lib/catalog/server-api';
import { displayFit } from '@/lib/display-fit';
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
  const tree = await loadCategories();
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
        <CategoryIndex roots={tree.data} locale={locale} />
      )}
    </main>
  );
}
