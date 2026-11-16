import type { CatalogQuery, Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ListingCard } from '@/components/catalog/ListingCard';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { HomeSearch } from '@/components/market/HomeSearch';
import { LendCalculator } from '@/components/market/LendCalculator';
import { JsonLd } from '@/components/seo/JsonLd';
import { Link } from '@/i18n/navigation';
import { loadPlaces, loadSearch } from '@/lib/catalog/server-api';
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
 * The home (owner, 2026-11-16) is one throw of a yo-yo — out and back. Out: the search in its working form
 * and the newest real items hanging as price tags on the string (the hand pushes them). The loop: a held
 * night scene where the yo-yo runs through the four stops of a rental and the deposit comes back. Then
 * what is new, and back: what your things could earn, and a close that reels you to the top. The catalog
 * lives in the navigation; the cinematic introduction is /what-is-yoyo.
 */
export default async function HomePage({ params }: Params) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [meta, t] = await Promise.all([getTranslations('pages.home'), getTranslations('market')]);
  const [newest, places] = await Promise.all([loadSearch({ sort: 'new', page: 1 } as CatalogQuery), loadPlaces()]);
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

    </main>
  );
}
