import { Link } from '@/i18n/navigation';

const PILL =
  'border-ink bg-surface ease-yoyo inline-flex min-h-11 items-center gap-2 rounded-pill border px-5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]';

/** Plain links «Back», «Page 2 of 5», «Next» (W03 §H: paging is links, crawlable and shareable). */
export function Pagination({
  page,
  pages,
  hrefFor,
  labels,
}: {
  page: number;
  pages: number;
  hrefFor(page: number): string;
  labels: { nav: string; previous: string; next: string; status: string };
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={labels.nav} className="flex flex-wrap items-center justify-center gap-3 pt-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={PILL}>
          <span aria-hidden="true">←</span> {labels.previous}
        </Link>
      ) : null}
      <p className="text-sm font-bold tabular-nums">{labels.status}</p>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={PILL}>
          {labels.next} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </nav>
  );
}
