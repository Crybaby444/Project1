import type { CatalogQuery, Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ListingCard } from '@/components/catalog/ListingCard';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { HomeFaq } from '@/components/market/HomeFaq';
import { HomeSearch } from '@/components/market/HomeSearch';
import { LendCalculator } from '@/components/market/LendCalculator';
import { TrustRow } from '@/components/market/TrustRow';
import { TwoDoors } from '@/components/market/TwoDoors';
import { JsonLd } from '@/components/seo/JsonLd';
import { Link } from '@/i18n/navigation';
import { loadPlaces, loadSearch } from '@/lib/catalog/server-api';
import { pageMetadata } from '@/lib/seo';
import { CONTACT_EMAIL, LIST_ITEM_HREF, SITE_URL } from '@/lib/site';

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
 * The home (owner, 2026-11-16): the marketplace. The search (what, where, when) with four promises under
 * it, what is new, what your things could earn, the questions before a first deal, and a door for each end
 * of the string. The catalog itself lives in the header.
 */
/** Static classes for the spot's width (Tailwind sees whole class names only). */
const SPAN_SM = ['col-span-2', 'col-span-1', 'col-span-2'] as const;
const SPAN_LG = ['', 'lg:col-span-1', 'lg:col-span-2', 'lg:col-span-3'] as const;

export default async function HomePage({ params }: Params) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [meta, t] = await Promise.all([getTranslations('pages.home'), getTranslations('market')]);
  const [newest, places] = await Promise.all([loadSearch({ sort: 'new', page: 1 } as CatalogQuery), loadPlaces()]);
  const items = newest.ok ? newest.data.items : [];
  const districts = places.ok ? places.data.districts : [];
  const today = new Date().toISOString().slice(0, 10);
  const shown = items.slice(0, 8);
  // Few things yet: the empty places in the last row invite the visitor to put theirs there.
  const spare = { sm: (2 - (shown.length % 2)) % 2, lg: (4 - (shown.length % 4)) % 4 };

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
        <TrustRow />
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
            {shown.map((item, i) => (
              <li key={item.id}>
                <ListingCard item={item} eager={i < 4} />
              </li>
            ))}
            {LIST_ITEM_HREF && spare.lg > 0 ? (
              <li className={`${SPAN_SM[spare.sm]} ${SPAN_LG[spare.lg]}`}>
                <Link
                  href={LIST_ITEM_HREF}
                  className="group border-ink/25 hover:border-ink rounded-media flex h-full min-h-[14rem] flex-col justify-between gap-6 border-[1.5px] border-dashed p-6 transition-colors sm:p-8"
                  data-your-spot=""
                >
                  <span aria-hidden="true" className="bg-ink grid size-12 place-items-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-180">
                    <span className="bg-canvas h-[3px] w-6 rounded-full" />
                  </span>
                  <span className="flex flex-col gap-2">
                    <span className="font-display text-[clamp(1.8rem,3vw,2.8rem)] leading-[0.9] font-black uppercase">{t('fresh.spot.title')}</span>
                    <span className="text-ink/75 max-w-[36ch] text-[15px] leading-relaxed">{t('fresh.spot.body')}</span>
                    <span className="mt-2 inline-flex items-center gap-2 text-[15px] font-bold underline decoration-1 underline-offset-4">{t('fresh.spot.cta')}</span>
                  </span>
                </Link>
              </li>
            ) : null}
          </ul>
          <RecentlyViewed />
        </section>
      )}

      <div className="border-ink/15 border-t">
        <LendCalculator />
      </div>

      <div className="border-ink/15 border-t">
        <HomeFaq />
      </div>

      <TwoDoors />

    </main>
  );
}
