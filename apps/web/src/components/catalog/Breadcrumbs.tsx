import { Link } from '@/i18n/navigation';

export type Crumb = { label: string; href?: string };

/**
 * Where a page sits in the catalog (W03 §E): Home › Catalog › Category › Subcategory › Item, by the
 * category tree, not by how the visitor came. The last crumb is the page itself.
 */
export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((crumb, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="rounded-pill underline-offset-4 [overflow-wrap:anywhere] hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="font-bold [overflow-wrap:anywhere]">
                  {crumb.label}
                </span>
              )}
              {!last && (
                <span aria-hidden="true" className="text-ink/60">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
