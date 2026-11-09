import { STICKER_COLORS, type Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { SearchBox } from '@/components/catalog/SearchBox';
import { Link } from '@/i18n/navigation';
import { categoryLink, categoryName } from '@/lib/catalog/categories';
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
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {tree.data.map((root, index) => (
            <li key={root.id} className="border-ink bg-surface rounded-card flex flex-col gap-4 border p-5">
              <h2 className="flex items-center gap-3 text-xl font-bold">
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: STICKER_COLORS[root.sticker] }}
                  className={`ease-yoyo inline-block size-6 shrink-0 rounded-full border border-black transition-transform duration-450 hover:scale-110 ${index % 2 ? 'rotate-6' : '-rotate-6'}`}
                />
                <Link href={categoryLink(root, locale)} className="rounded-pill [overflow-wrap:anywhere] underline-offset-4 hover:underline">
                  {categoryName(root, locale)}
                </Link>
              </h2>
              {root.children.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {root.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={categoryLink(child, locale)}
                        className="border-ink rounded-pill ease-yoyo hover:bg-mist inline-flex min-h-10 items-center border px-3 text-sm font-bold transition-transform duration-150 hover:-translate-y-0.5"
                      >
                        <span className="[overflow-wrap:anywhere]">{categoryName(child, locale)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
