import type { CategoryNode, Locale } from '@yoyo/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { categoryLink, categoryName } from '@/lib/catalog/categories';

/** At most this many: two strings of six on a wide screen; a phone scrolls along one. */
const MOST = 12;

/** How far each yo-yo hangs below the string, in turn (rem): an uneven rhythm, like a shop's display. */
const DROPS = [1.75, 4, 2.5, 4.75, 2, 3.5] as const;

/**
 * The home's categories as yo-yos on a string (owner, 2026-11-28: "something with a twist"): each top
 * category that holds something hangs at its own length, its face a window with the photo of its newest
 * item, cut by the mark's slit; its name and count hang under it. Pointing at one sets it swinging. The
 * fullest first; one string that scrolls sideways on a phone, two strings of six from lg. An empty category
 * is not shown (nothing empty for show).
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
    <section aria-labelledby="home-shelf" className="page stack-section pt-16 sm:pt-24" data-category-shelf="">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="home-shelf" className="type-section">
          {t('title')}
        </h2>
        <Link href="/c" className="text-base font-bold underline decoration-1 underline-offset-4">
          {t('all')}
        </Link>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pt-2 pb-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="m-0 flex w-max list-none gap-x-6 gap-y-14 p-0 lg:grid lg:w-full lg:grid-cols-6 lg:gap-x-8">
          {shelf.map(({ root, count, cover }, index) => {
            const name = categoryName(root, locale);
            return (
              <li
                key={root.id}
                style={{ '--drop': `${DROPS[index % DROPS.length]}rem` } as React.CSSProperties}
                // Each item draws its piece of the string, half a gap past each side, so the pieces join up.
                className="before:bg-ink/35 relative w-[9.5rem] before:absolute before:-inset-x-3 before:top-0 before:h-[1.5px] sm:w-[11rem] lg:w-auto lg:before:-inset-x-4"
              >
                <Link
                  href={categoryLink(root, locale)}
                  className="group hover:animate-[yoyo-swing_1.4s_cubic-bezier(0.25,0.8,0.3,1)] focus-visible:animate-[yoyo-swing_1.4s_cubic-bezier(0.25,0.8,0.3,1)] flex origin-top flex-col items-center gap-3 pt-[var(--drop)] text-center motion-reduce:!animate-none"
                  data-shelf-category={root.slug}
                >
                  <span aria-hidden="true" className="bg-ink/60 absolute top-0 left-1/2 h-[var(--drop)] w-[1.5px] -translate-x-1/2" />
                  <span className="bg-mist relative block aspect-square w-full max-w-[9.5rem] overflow-hidden rounded-full shadow-[0_24px_36px_-24px_rgb(10_11_14/0.5)] sm:max-w-[10.5rem]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a 640×480 card from the API's storage
                      <img
                        src={cover}
                        alt=""
                        width={640}
                        height={480}
                        loading={index < 6 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="ease-yoyo size-full object-cover transition-transform duration-700 group-hover:scale-[1.07] motion-reduce:transition-none"
                      />
                    ) : null}
                    <span aria-hidden="true" className="bg-canvas absolute inset-x-0 top-1/2 h-[4%] -translate-y-1/2" />
                    <span aria-hidden="true" className="absolute inset-0 rounded-full shadow-[inset_0_0_0_5px_var(--ink)]" />
                  </span>
                  <span className="flex flex-col items-center gap-1">
                    <span
                      data-cursor-text
                      className="font-display text-[1.45rem] leading-[0.95] font-black text-balance uppercase decoration-2 underline-offset-4 [overflow-wrap:anywhere] group-hover:underline"
                    >
                      {name}
                    </span>
                    <span className="text-ink/65 text-sm font-semibold tabular-nums">{t('count', { count })}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
