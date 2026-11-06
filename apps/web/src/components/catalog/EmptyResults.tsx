import { getTranslations } from 'next-intl/server';
import { Sticker } from '@/components/ui/Sticker';
import { Link } from '@/i18n/navigation';
import type { CatalogParams } from '@/lib/catalog/params';

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
    <div className="border-ink bg-surface rounded-card flex flex-col items-center gap-4 border px-6 py-12 text-center">
      <Sticker kind="star" size={72} />
      <h2 className="text-2xl font-bold">{t('title')}</h2>
      {tips.length > 0 ? (
        <ul className="flex max-w-[46ch] flex-col gap-1 text-base">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : (
        <p className="max-w-[46ch]">{t('body')}</p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={resetHref} className="bg-cta text-cta-fg border-cta rounded-pill ease-yoyo inline-flex min-h-10 items-center border px-5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5">
          {t('reset')}
        </Link>
        <Link href="/c" className="border-ink bg-surface rounded-pill ease-yoyo inline-flex min-h-10 items-center border px-5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5">
          {t('allCategories')}
        </Link>
      </div>
    </div>
  );
}
