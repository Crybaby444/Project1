import type { Locale } from '@yoyo/shared';
import { ForYou } from '@/components/market/ForYou';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { CategoryShelf } from '@/components/market/CategoryShelf';
import { HomeFaq } from '@/components/market/HomeFaq';
import { LendCalculator } from '@/components/market/LendCalculator';
import { TrustRow } from '@/components/market/TrustRow';
import { JsonLd } from '@/components/seo/JsonLd';
import { Link } from '@/i18n/navigation';
import { loadCategories, loadCategoryOverview, loadForYou } from '@/lib/catalog/server-api';
import { currentCountry } from '@/lib/country/server';
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

const SPAN_SM = ['col-span-2', 'col-span-1', 'col-span-2'] as const;
const SPAN_LG = ['', 'lg:col-span-1', 'lg:col-span-2', 'lg:col-span-3'] as const;

/**
 * The home (owner, 2026-11-28: "the search stays only in the navigation", no extra lines): the promise with
 * four short guarantees beside it, a shelf of the categories that hold something (each with the photo of its
 * newest item), what is popular now, a night band where your own things count up their earnings, and the
 * questions people ask before a first deal. Searching is the header's job, on every page.
 */
export default async function HomePage({ params }: Params) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [meta, t] = await Promise.all([getTranslations('pages.home'), getTranslations('market')]);
  const [feed, tree, overview] = await Promise.all([loadForYou(), loadCategories(), loadCategoryOverview()]);
  const initial = feed.ok ? feed.data : { items: [], personal: false };
  const items = initial.items;
  const shown = items.slice(0, 8);
  // Few things yet: the empty places in the last row invite the visitor to put theirs there.
  const spare = { sm: (2 - (shown.length % 2)) % 2, lg: (4 - (shown.length % 4)) % 4 };

  return (
    <main className="flex flex-1 flex-col" data-market-home="">
      <JsonLd data={structuredData(meta('description'))} />

      <section aria-labelledby="home-title" className="page pt-9 pb-2 sm:pt-12">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <h1 id="home-title" className="font-display text-display-xl leading-[0.84] font-black text-balance uppercase">
            {t('hero.title')}
          </h1>
          <TrustRow />
        </div>
      </section>

      {tree.ok && overview && <CategoryShelf roots={tree.data} locale={locale} counts={overview.counts} covers={overview.covers ?? {}} />}

      {items.length > 0 && (
        <section aria-labelledby="home-fresh" className="page stack-page pt-14 pb-20 sm:pt-20 sm:pb-28">
          <ForYou
            initial={initial}
            country={await currentCountry()}
            headingId="home-fresh"
            titles={{ personal: t('forYou.personal'), popular: t('forYou.popular') }}
            action={
              <Link href="/search?sort=new" className="text-base font-bold underline decoration-1 underline-offset-4">
                {t('fresh.all')}
              </Link>
            }
          >
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
                    <span className="type-block">{t('fresh.spot.title')}</span>
                    <span className="text-ink/75 max-w-[36ch] text-base leading-relaxed">{t('fresh.spot.body')}</span>
                    <span className="mt-2 inline-flex items-center gap-2 text-base font-bold underline decoration-1 underline-offset-4">{t('fresh.spot.cta')}</span>
                  </span>
                </Link>
              </li>
            ) : null}
          </ForYou>
          <RecentlyViewed />
        </section>
      )}

      <LendCalculator />

      <HomeFaq />
    </main>
  );
}
