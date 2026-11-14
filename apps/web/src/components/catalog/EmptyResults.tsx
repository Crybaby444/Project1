import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { CatalogParams } from '@/lib/catalog/params';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Nothing found (W03 §H: a 200 with a clear empty state and somewhere to go, not a soft 404): a
 * sticker, what to loosen, and links to reset or to the whole catalog.
 */
export async function EmptyResults({ params, resetHref }: { params: CatalogParams; resetHref: string }) {
  const t = await getTranslations('catalog.empty');
  const tips = [
    params.from ? t('tipDates') : null,
    params.priceMin !== undefined || params.priceMax !== undefined ? t('tipPrice') : null,
    params.district ? t('tipDistrict') : null,
    params.q ? t('tipText') : null,
  ].filter((tip): tip is string => tip !== null);
  return (
    <EmptyState
      title={t('title')}
      body={tips.length > 0 ? (
        <span className="flex flex-col gap-1">
          {tips.map((tip) => (
            <span key={tip}>{tip}</span>
          ))}
        </span>
      ) : (
        t('body')
      )}
      action={<>
        <Link href={resetHref} className="bg-ink text-canvas border-ink rounded-pill ease-yoyo inline-flex min-h-11 items-center border px-5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5">
          {t('reset')}
        </Link>
        <Link href="/c" className="border-ink bg-surface rounded-pill ease-yoyo inline-flex min-h-11 items-center border px-5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5">
          {t('allCategories')}
        </Link>
      </>}
    />
  );
}
