import type { CatalogQuery, Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CategoryIndex } from '@/components/catalog/CategoryIndex';
import { ListingCard } from '@/components/catalog/ListingCard';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { HomeSearch } from '@/components/market/HomeSearch';
import { LendCalculator } from '@/components/market/LendCalculator';
import { LoopBand } from '@/components/market/LoopBand';
import { TagString } from '@/components/market/TagString';
import { JsonLd } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { loadCategories, loadCategoryCounts, loadPlaces, loadSearch } from '@/lib/catalog/server-api';
import { pageMetadata } from '@/lib/seo';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.home' });
  return pageMetadata({ locale: locale as Locale, path: '/', title: t('title'), description: t('description'), brand: false });
}

/** Who runs the site and how to search it, for search engines (schema.org). */
function structuredData(description: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Yoyo',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon.svg`,
      email: CONTACT_EMAIL,
      areaServed: ['LV', 'EE', 'LT'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Yoyo',
      url: `${SITE_URL}/`,
      description,
      inLanguage: ['en', 'lv', 'ru'],
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/search?q={query}`, 'query-input': 'required name=query' },
    },
  ];
}

/**
 * The home (owner, 2026-11-16): the marketplace itself. The search in its working form and the newest real
 * items hanging as price tags on the yo-yo's string; then every category, the loop of a rental on the night
 * ground, what is new, what your things could earn, and a close. The cinematic introduction is /what-is-yoyo.
 */
export default async function HomePage({ params }: Params) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [meta, t] = await Promise.all([getTranslations('pages.home'), getTranslations('market')]);
  const [tree, counts, newest, places] = await Promise.all([loadCategories(), loadCategoryCounts(), loadSearch({ sort: 'new', page: 1 } as CatalogQuery), loadPlaces()]);
  const items = newest.ok ? newest.data.items : [];
  const districts = places.ok ? places.data.districts : [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="flex flex-1 flex-col" data-market-home="">
      <JsonLd data={structuredData(meta('description'))} />

      <section aria-labelledby="home-title" className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-4 pt-9 pb-4 sm:px-8 sm:pt-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end lg:gap-12">
          <h1 id="home-title" className="font-display text-[clamp(3rem,8.4vw,6rem)] leading-[0.84] font-black text-balance uppercase">
            {t('hero.title')}
          </h1>
          <p className="text-ink/80 max-w-[44ch] text-[18px] leading-relaxed lg:pb-2">{t('hero.lead')}</p>
        </div>
        <HomeSearch districts={districts} today={today} />
      </section>

      <TagString items={items} />

      {tree.ok && (
        <section aria-labelledby="home-categories" className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="home-categories" className="font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.88] font-black uppercase">
              {t('categories.title')}
            </h2>
            <Link href="/c" className="text-[15px] font-bold underline decoration-1 underline-offset-4">
              {t('categories.all')}
            </Link>
          </div>
          <CategoryIndex roots={tree.data} locale={locale} counts={counts} />
        </section>
      )}

      <LoopBand />

      {items.length > 0 && (
        <section aria-labelledby="home-fresh" className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="home-fresh" className="font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.88] font-black uppercase">
              {t('fresh.title')}
            </h2>
            <Link href="/search?sort=new" className="text-[15px] font-bold underline decoration-1 underline-offset-4">
              {t('fresh.all')}
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4">
            {items.slice(0, 8).map((item, i) => (
              <li key={item.id}>
                <ListingCard item={item} eager={i < 4} />
              </li>
            ))}
          </ul>
          <RecentlyViewed />
        </section>
      )}

      <div className="border-ink/15 border-t">
        <LendCalculator />
      </div>

      <section aria-labelledby="home-close" className="border-ink/15 border-t">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-8 px-4 py-20 sm:px-8 sm:py-28">
          <h2 id="home-close" className="font-display text-[clamp(3rem,9vw,6rem)] leading-[0.84] font-black uppercase">
            {t('close.title')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button href="/c" size="lg">
              {t('close.rent')}
            </Button>
            <Button href="/listings/new" size="lg" variant="ghost">
              {t('close.lend')}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
