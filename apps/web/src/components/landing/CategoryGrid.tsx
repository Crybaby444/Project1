import type { CategoryNode, StickerColor } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Sticker, type StickerKind } from '@/components/ui/Sticker';

// Sticker fills are the same in both themes, so the text on them is fixed too (AA on every fill).
const FILL: Record<StickerColor, string> = {
  blue: 'bg-sticker-blue text-black',
  mint: 'bg-sticker-mint text-black',
  lavender: 'bg-sticker-lavender text-black',
  ember: 'bg-sticker-ember text-black',
  sun: 'bg-sticker-sun text-black',
  violet: 'bg-sticker-violet text-white',
};

const STICKERS: StickerKind[] = ['star', 'bolt', 'coin', 'heart', 'key', 'tag', 'check', 'yoyo'];
const TILTS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

type Locale = 'en' | 'lv' | 'ru';

/**
 * The top categories as sticker cards: the name in the page language, how many subcategories it has
 * and their names. Real data only. Not links: the catalog that would open is not on the site yet.
 */
export function CategoryGrid({ categories }: { categories: CategoryNode[] }) {
  const t = useTranslations('landing.categories');
  const locale = useLocale() as Locale;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category, index) => (
        <li key={category.id} className={TILTS[index % TILTS.length]}>
          <Card interactive fill={FILL[category.sticker]} className="relative flex h-full flex-col gap-3 p-6">
            <Sticker kind={STICKERS[index % STICKERS.length]!} size={44} className="absolute -top-4 -right-3 rotate-12" />
            <h3 className="pr-8 text-2xl leading-tight font-bold text-balance">{category.names[locale]}</h3>
            {category.children.length > 0 && (
              <>
                <p className="text-xs font-bold tracking-[0.032em] uppercase">
                  {t('count', { count: category.children.length })}
                </p>
                <p className="text-[15px] leading-relaxed">
                  {category.children.map((child) => child.names[locale]).join(' · ')}
                </p>
              </>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
