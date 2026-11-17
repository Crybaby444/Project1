import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { LIST_ITEM_HREF } from '@/lib/site';

/**
 * In place of the booking panel on an example listing (owner, 2026-11-16: demo items on the live site,
 * marked and never rented): what this is, and the two real things to do instead.
 */
export async function DemoNotice() {
  const t = await getTranslations('item.demo');
  return (
    <section aria-labelledby="demo-title" className="border-ink rounded-media bg-surface flex flex-col gap-4 border p-6" data-demo-notice="">
      <span className="rounded-pill bg-ink text-canvas self-start px-2.5 py-1 text-xs font-bold tracking-[0.04em] uppercase">{t('badge')}</span>
      <h2 id="demo-title" className="font-display text-display-s leading-[0.9] font-black uppercase">
        {t('title')}
      </h2>
      <p className="leading-relaxed">{t('body')}</p>
      <div className="flex flex-wrap gap-2">
        <Button href="/c">{t('browse')}</Button>
        {LIST_ITEM_HREF && (
          <Button href={LIST_ITEM_HREF} variant="ghost">
            {t('lend')}
          </Button>
        )}
      </div>
    </section>
  );
}
