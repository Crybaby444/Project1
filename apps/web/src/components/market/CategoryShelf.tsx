import type { CategoryNode, Locale } from '@yoyo/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { categoryLink, categoryName } from '@/lib/catalog/categories';

/** At most this many on a wide screen: two rows of six. A phone scrolls through all of them. */
const MOST = 12;

/**
 * The home's shelf (owner, 2026-11-28: the search left the home): the top categories that hold something,
 * the fullest first, each with the photo of its newest item. One row that scrolls sideways on a phone, two
 * rows of six from lg. An empty category is not shown (nothing empty for show).
 */
export async function CategoryShelf({
  roots,
  locale,
  counts,
  covers,
}: {
  roots: CategoryNode[];
  locale: Locale;
  counts: Record<string, number>;
  covers: Record<string, { thumb: string; card: string }[]>;
}) {
  const t = await getTranslations('market.shelf');
  const total = (node: CategoryNode): number => (counts[node.id] ?? 0) + node.children.reduce((sum, child) => sum + total(child), 0);
  const shelf = roots
    .map((root) => ({ root, count: total(root), cover: covers[root.id]?.[0]?.card ?? null }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, MOST);
  if (shelf.length === 0) return null;

  return (
    <section aria-labelledby="home-shelf" className="page stack-section pt-12 sm:pt-16" data-category-shelf="">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="home-shelf" className="type-section">
          {t('title')}
        </h2>
        <Link href="/c" className="text-base font-bold underline decoration-1 underline-offset-4">
          {t('all')}
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-4 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {shelf.map(({ root, count, cover }, index) => {
          const name = categoryName(root, locale);
          return (
            <li key={root.id} className="w-[42vw] max-w-[13rem] shrink-0 snap-start sm:w-48 lg:w-auto lg:max-w-none">
              <Link href={categoryLink(root, locale)} className="group flex flex-col gap-3" data-shelf-category={root.slug}>
                <span className="bg-mist rounded-media relative block aspect-square overflow-hidden">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a 640×480 card from the API's storage
                    <img
                      src={cover}
                      alt=""
                      width={640}
                      height={480}
                      loading={index < 6 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="ease-yoyo size-full object-cover transition-transform duration-700 group-hover:scale-[1.05] motion-reduce:transition-none"
                    />
                  ) : null}
                  <span className="bg-canvas/90 text-ink rounded-pill absolute top-2.5 right-2.5 inline-flex min-h-7 items-center px-2.5 text-xs font-bold tabular-nums backdrop-blur">
                    {t('count', { count })}
                  </span>
                </span>
                <span
                  data-cursor-text
                  className="font-display text-[1.6rem] leading-[0.95] font-black text-balance uppercase decoration-2 underline-offset-4 [overflow-wrap:anywhere] group-hover:underline"
                >
                  {name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
