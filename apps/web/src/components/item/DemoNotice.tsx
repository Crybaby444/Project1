import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { LIST_ITEM_HREF } from '@/lib/site';
import { Sheet } from '@/components/ui/Sheet';

/**
 * In place of the booking panel on an example listing (owner, 2026-11-16: demo items on the live site,
 * marked and never rented): what this is, and the two real things to do instead. The title says it is an
 * example; no badge repeats it above (DESIGN.md: no kicker above a heading).
 */
export async function DemoNotice() {
  const t = await getTranslations('item.demo');
  return (
    <Sheet aria-labelledby="demo-title" tone="ring" className="flex flex-col gap-4" data-demo-notice="">
      <h2 id="demo-title" className="type-block">
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
    </Sheet>
  );
}
