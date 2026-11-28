import type { CatalogQuery, Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CategoryIndex } from '@/components/catalog/CategoryIndex';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { ForYou } from '@/components/market/ForYou';
import { HomeFaq } from '@/components/market/HomeFaq';
import { LendCalculator } from '@/components/market/LendCalculator';
import { TrustRow } from '@/components/market/TrustRow';
import { JsonLd } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { Link } from '@/i18n/navigation';
import { coversByRoot } from '@/lib/catalog/categories';
import { loadCategories, loadCategoryOverview, loadForYou, loadSearch } from '@/lib/catalog/server-api';
import { currentCountry } from '@/lib/country/server';
import { displayFit } from '@/lib/display-fit';
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
 * The home (owner, 2026-11-28: "it still looks cheap", and "no yo-yo used as decoration anywhere on the
 * site"). Calm and sure of itself, as premium brands are: the promise set large across the page with the way
 * into the catalog and the four guarantees under it; what is popular now; the catalog as a quiet index; the
 * night band where your own things count up their earnings; the questions before a first deal. No gimmicks,
 * no ornament, room to breathe. Searching is the header's job, on every page.
 */
export default async function HomePage({ params }: Params) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [meta, t] = await Promise.all([getTranslations('pages.home'), getTranslations('market')]);
  const [feed, tree, overview, newest] = await Promise.all([
    loadForYou(),
    loadCategories(),
    loadCategoryOverview(),
    loadSearch({ sort: 'new', page: 1 } as CatalogQuery),
  ]);
  const initial = feed.ok ? feed.data : { items: [], personal: false };
  const items = initial.items;
  const shown = items.slice(0, 8);
  // Few things yet: the empty places in the last row invite the visitor to put theirs there.
  const spare = { sm: (2 - (shown.length % 2)) % 2, lg: (4 - (shown.length % 4)) % 4 };
  // The index's peek: each category's own newest covers; an API one release behind gives none, so the newest page stands in.
  const covers = overview?.covers
    ? Object.fromEntries(Object.entries(overview.covers).map(([root, list]) => [root, list.map((cover) => cover.thumb)]))
    : tree.ok && newest.ok
      ? coversByRoot(tree.data, newest.data.items)
      : undefined;
  const lines = [t('hero.line1'), t('hero.line2')];

  return (
    <main className="flex flex-1 flex-col" data-market-home="">
      <JsonLd data={structuredData(meta('description'))} />

      <section aria-labelledby="home-title" className="page @container pt-12 pb-4 sm:pt-20">
        <h1
          id="home-title"
          // As large as the page allows: its longest word always fits the line, on a 320px phone too.
          style={displayFit(lines.join(' '), { min: '2.5rem', max: 'clamp(3rem, 11.5vw, 12.5rem)' })}
          className="font-display text-display-fit leading-[0.84] font-black tracking-[-0.01em] uppercase"
        >
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 sm:mt-14">
          <Button href="/c" size="lg">
            {t('hero.browse')}
          </Button>
          {LIST_ITEM_HREF && (
            <Link href={LIST_ITEM_HREF} className="text-base font-bold underline decoration-1 underline-offset-4">
              {t('hero.lend')}
            </Link>
          )}
        </div>
        <div className="border-ink/15 mt-14 border-t pt-8 sm:mt-20">
          <TrustRow />
        </div>
      </section>

      {items.length > 0 && (
        <section aria-labelledby="home-fresh" className="page page-chapter stack-page">
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
                  <span aria-hidden="true" className="bg-ink text-canvas grid size-12 place-items-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-90">
                    <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current [stroke-linecap:round] [stroke-width:2.25]">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                  <span className="flex flex-col gap-2">
                    <span className="type-block">{t('fresh.spot.title')}</span>
                    <span className="mt-2 inline-flex items-center gap-2 text-base font-bold underline decoration-1 underline-offset-4">{t('fresh.spot.cta')}</span>
                  </span>
                </Link>
              </li>
            ) : null}
          </ForYou>
          <RecentlyViewed />
        </section>
      )}

      {tree.ok && (
        <div className="page pb-20 sm:pb-28">
          <Section
            title={t('shelf.title')}
            id="home-catalog"
            action={
              <Link href="/c" className="text-base font-bold underline decoration-1 underline-offset-4">
                {t('shelf.all')}
              </Link>
            }
          >
            <CategoryIndex roots={tree.data} locale={locale} counts={overview?.counts} covers={covers} />
          </Section>
        </div>
      )}

      <LendCalculator />

      <HomeFaq />
    </main>
  );
}
