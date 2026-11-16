import type { Locale } from '@yoyo/shared';
import { useLocale } from 'next-intl';
import { JsonLd } from '@/components/seo/JsonLd';
import { Link } from '@/i18n/navigation';
import { breadcrumbJsonLd } from '@/lib/seo';

export type Crumb = { label: string; href?: string };

/**
 * Where a page sits in the catalog (W03 §E): Home › Catalog › Category › Subcategory › Item, by the
 * category tree, not by how the visitor came. The last crumb is the page itself. Search engines get the
 * same trail as a BreadcrumbList.
 */
export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  const locale = useLocale() as Locale;
  return (
    <nav aria-label={label} className="text-sm">
      <JsonLd data={breadcrumbJsonLd(items, locale)} />
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((crumb, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="rounded-pill inline-flex min-h-6 items-center underline-offset-4 [overflow-wrap:anywhere] hover:underline">
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
