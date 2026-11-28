import type { CategoryNode, Locale } from '@yoyo/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { categoryLink, categoryName } from '@/lib/catalog/categories';

/**
 * The home's way into the catalog, as the big marketplaces do it (owner, 2026-11-28): one row of pills, each
 * a top category that holds something with a small round photo of its newest item, its name and how many
 * things it has; the fullest first, and "All categories" at the end. It scrolls sideways on a phone and wraps
 * on a desktop. An empty category is not shown.
 */
export async function CategoryChips({
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
  const chips = roots
    .map((root) => ({ root, count: total(root), cover: covers[root.id]?.[0]?.thumb ?? null }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  if (chips.length === 0) return null;

  const pill =
    'border-ink/15 bg-surface hover:border-ink/50 rounded-pill ease-yoyo flex min-h-12 items-center gap-2.5 border py-1 pr-4 pl-1 text-sm font-bold whitespace-nowrap transition-[border-color,transform] duration-200 hover:-translate-y-0.5';

  return (
    <nav aria-label={t('title')} className="page pt-8 sm:pt-10" data-category-chips="">
      <ul className="-mx-4 flex list-none gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {chips.map(({ root, count, cover }) => (
          <li key={root.id} className="shrink-0">
            <Link href={categoryLink(root, locale)} className={pill} data-chip={root.slug}>
              <span aria-hidden="true" className="bg-mist relative block size-10 shrink-0 overflow-hidden rounded-full">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a 160×120 thumbnail from the API's storage
                  <img src={cover} alt="" width={160} height={120} loading="lazy" decoding="async" className="size-full object-cover" />
                ) : null}
              </span>
              <span>{categoryName(root, locale)}</span>
              <span className="text-ink/70 font-semibold tabular-nums">{count}</span>
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <Link href="/c" className={`${pill} pl-4`}>
            {t('all')}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
