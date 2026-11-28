import type { Locale } from '@yoyo/shared';
import { ForYou } from '@/components/market/ForYou';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { CategoryShelf } from '@/components/market/CategoryShelf';
import { HeroYoyo, type HeroItem } from '@/components/market/HeroYoyo';
import { HomeFaq } from '@/components/market/HomeFaq';
import { Button } from '@/components/ui/Button';
import { LendCalculator } from '@/components/market/LendCalculator';
import { TrustRow } from '@/components/market/TrustRow';
import { JsonLd } from '@/components/seo/JsonLd';
import { Link } from '@/i18n/navigation';
import { loadCategories, loadCategoryOverview, loadForYou } from '@/lib/catalog/server-api';
import { formatEuros } from '@/lib/listings/money';
import { listingPath } from '@/lib/seo';
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
 * The home (owner, 2026-11-28: the search only in the navigation, no extra lines, then "something with a
 * twist, and beautiful"). The promise beside the Yoyo mark made large: a yo-yo hanging from the bar whose
 * face is a window with a real item in it, thrown in when the page opens and coming back with another thing.
 * Under them the four guarantees; then the categories as yo-yos on a string, what is popular now, a night
 * band where your own things count up their earnings, and the questions before a first deal.
 */
export default async function HomePage({ params }: Params) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [meta, t, tc] = await Promise.all([getTranslations('pages.home'), getTranslations('market'), getTranslations('catalog.card')]);
  const [feed, tree, overview] = await Promise.all([loadForYou(), loadCategories(), loadCategoryOverview()]);
  const initial = feed.ok ? feed.data : { items: [], personal: false };
  const items = initial.items;
  const shown = items.slice(0, 8);
  // What the yo-yo brings: popular things that have a photo.
  const hero: HeroItem[] = items
    .filter((item) => item.cover)
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.title,
      href: listingPath(item.id, item.title),
      photo: item.cover!.card,
      price: tc('perDay', { price: formatEuros(item.dailyCents, locale) }),
      place: [item.city, item.district].filter(Boolean).join(', '),
      demo: item.demo,
    }));
  // Few things yet: the empty places in the last row invite the visitor to put theirs there.
  const spare = { sm: (2 - (shown.length % 2)) % 2, lg: (4 - (shown.length % 4)) % 4 };

  return (
    // The yo-yo's light and the shelf's string reach past the page's edges: clipped sideways, never down.
    <main className="flex flex-1 flex-col overflow-x-clip" data-market-home="">
      <JsonLd data={structuredData(meta('description'))} />

      <section aria-labelledby="home-title" className="page">
        <div className="grid gap-x-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
          <div className="flex flex-col items-start gap-8 pt-10 sm:pt-14 lg:py-20">
            <h1 id="home-title" className="font-display text-display-xl leading-[0.84] font-black text-balance uppercase">
              {t('hero.title')}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button href="/c" size="lg">
                {t('hero.browse')}
              </Button>
              {LIST_ITEM_HREF && (
                <Link href={LIST_ITEM_HREF} className="text-base font-bold underline decoration-1 underline-offset-4">
                  {t('hero.lend')}
                </Link>
              )}
            </div>
          </div>
          <HeroYoyo items={hero} />
        </div>
        <div className="border-ink/15 mt-10 border-t pt-6 sm:mt-12">
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
