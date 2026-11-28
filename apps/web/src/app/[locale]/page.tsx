import type { Locale } from '@yoyo/shared';
import { ForYou } from '@/components/market/ForYou';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { CatalogItem, CatalogQuery } from '@yoyo/shared';
import { ListingCard } from '@/components/catalog/ListingCard';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { CategoryChips } from '@/components/market/CategoryChips';
import { HeroYoyo, type HeroItem } from '@/components/market/HeroYoyo';
import { HomeFaq } from '@/components/market/HomeFaq';
import { HowItWorks } from '@/components/market/HowItWorks';
import { Rail, RAIL_ITEM } from '@/components/market/Rail';
import { Button } from '@/components/ui/Button';
import { LendCalculator } from '@/components/market/LendCalculator';
import { TrustRow } from '@/components/market/TrustRow';
import { JsonLd } from '@/components/seo/JsonLd';
import { Link } from '@/i18n/navigation';
import { loadCategories, loadCategoryOverview, loadForYou, loadSearch } from '@/lib/catalog/server-api';
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

/**
 * The home (owner, 2026-11-28: "look at how the big companies do their home page and make ours better"). As
 * the big marketplaces do it, real things first and few words, in Yoyo's own world:
 *   - the hero: a night banner with the promise, the way into the catalog and the Yoyo mark made large, a
 *     yo-yo hanging from the top of the night whose face is a window with a real item (it is thrown in and
 *     comes back with another thing), and the four guarantees at its foot;
 *   - the categories as a row of pills with a photo each;
 *   - shelves that scroll sideways: popular now, new on Yoyo, and a couple of themes when they hold enough;
 *   - how it works in four steps on a string; the night band where your own things count up their earnings;
 *     the questions before a first deal.
 * Searching stays the header's job, on every page.
 */
const SHELF_MIN = 4;

/** A themed shelf: its id, title key, the category whose newest things it shows, and where "See all" goes. */
const THEMES = [
  { id: 'home-outdoors', key: 'outdoors', category: 'camping' },
  { id: 'home-tools', key: 'tools', category: 'tools' },
] as const;

export default async function HomePage({ params }: Params) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [meta, t, tc] = await Promise.all([getTranslations('pages.home'), getTranslations('market'), getTranslations('catalog.card')]);
  const [feed, tree, overview, newest, ...themed] = await Promise.all([
    loadForYou(),
    loadCategories(),
    loadCategoryOverview(),
    loadSearch({ sort: 'new', page: 1 } as CatalogQuery),
    ...THEMES.map((theme) => loadSearch({ sort: 'new', page: 1, category: theme.category } as CatalogQuery)),
  ]);
  const initial = feed.ok ? feed.data : { items: [], personal: false };
  const items = initial.items;
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
  const fresh = newest.ok ? newest.data.items.slice(0, 12) : [];
  const shelves = THEMES.map((theme, index) => {
    const found = themed[index];
    return { ...theme, items: found?.ok ? found.data.items.slice(0, 12) : [] };
  }).filter((shelf) => shelf.items.length >= SHELF_MIN);
  const country = await currentCountry();
  const seeAll = (href: string) => (
    <Link href={href} className="text-base font-bold underline decoration-1 underline-offset-4">
      {t('fresh.all')}
    </Link>
  );
  const cards = (list: CatalogItem[]) =>
    list.map((item) => (
      <li key={item.id} className={RAIL_ITEM}>
        <ListingCard item={item} />
      </li>
    ));

  return (
    // The yo-yo's light reaches past the page's edges: clipped sideways, never down.
    <main className="flex flex-1 flex-col overflow-x-clip" data-market-home="">
      <JsonLd data={structuredData(meta('description'))} />

      <section aria-labelledby="home-title" className="page pt-2 sm:pt-3">
        <div className="moment rounded-float">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1/3 -left-[12%] -z-10 size-[38rem] max-w-[110vw] rounded-full bg-[radial-gradient(closest-side,rgb(77_124_255/0.28),transparent)]"
          />
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="order-2 flex flex-col items-start gap-8 px-6 pt-2 pb-10 sm:px-10 lg:order-1 lg:justify-center lg:px-14 lg:py-20">
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
            <div className="order-1 px-4 pb-4 lg:order-2 lg:px-10 lg:pb-10">
              <HeroYoyo items={hero} />
            </div>
          </div>
          <div className="border-ink/15 mx-6 border-t py-6 sm:mx-10 lg:mx-14 lg:py-8">
            <TrustRow />
          </div>
        </div>
      </section>

      {tree.ok && overview && <CategoryChips roots={tree.data} locale={locale} counts={overview.counts} covers={overview.covers ?? {}} />}

      {items.length > 0 && (
        <div className="page pt-14 sm:pt-20">
          <ForYou
            rail
            initial={initial}
            country={country}
            headingId="home-fresh"
            titles={{ personal: t('forYou.personal'), popular: t('forYou.popular') }}
            action={seeAll('/search')}
          >
            {LIST_ITEM_HREF ? (
              <li className={RAIL_ITEM}>
                <Link
                  href={LIST_ITEM_HREF}
                  className="group border-ink/25 hover:border-ink rounded-media flex aspect-[4/5] h-auto w-full flex-col justify-between gap-6 border-[1.5px] border-dashed p-6 transition-colors"
                  data-your-spot=""
                >
                  <span aria-hidden="true" className="bg-ink grid size-12 place-items-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-180">
                    <span className="bg-canvas h-[3px] w-6 rounded-full" />
                  </span>
                  <span className="flex flex-col gap-2">
                    <span className="type-block">{t('fresh.spot.title')}</span>
                    <span className="inline-flex items-center gap-2 text-base font-bold underline decoration-1 underline-offset-4">{t('fresh.spot.cta')}</span>
                  </span>
                </Link>
              </li>
            ) : null}
          </ForYou>
        </div>
      )}

      {fresh.length >= SHELF_MIN && (
        <div className="page pt-14 sm:pt-20">
          <Rail id="home-new" title={t('rails.new')} action={seeAll('/search?sort=new')}>
            {cards(fresh)}
          </Rail>
        </div>
      )}

      {shelves.map((shelf) => (
        <div key={shelf.id} className="page pt-14 sm:pt-20">
          <Rail id={shelf.id} title={t(`rails.${shelf.key}`)}>
            {cards(shelf.items)}
          </Rail>
        </div>
      ))}

      <div className="page">
        <RecentlyViewed />
      </div>

      <HowItWorks />

      <div className="pt-20 sm:pt-28">
        <LendCalculator />
      </div>

      <HomeFaq />
    </main>
  );
}
