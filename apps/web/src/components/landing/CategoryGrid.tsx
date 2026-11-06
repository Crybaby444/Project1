import type { CategoryNode, StickerColor } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Marquee } from '@/components/motion/Marquee';
import { Tilt } from '@/components/motion/Tilt';
import { Sticker, type StickerKind } from '@/components/ui/Sticker';
import { Link } from '@/i18n/navigation';
import { categoryLink } from '@/lib/catalog/categories';

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
 * The marquee's exact footprint (two rows of 48 / 64px pills, the gap and the room for its pause
 * button), shared with the loading placeholder so the page does not jump when the list streams in.
 */
export const MARQUEE_BOX = 'mb-12 h-[8.25rem] sm:h-[10.25rem]';

/**
 * The top categories as sticker cards: the name in the page language, how many subcategories it has
 * and their names. Real data only. Each card opens its category in the catalog (the heading is the
 * link, stretched over the card).
 */
export function CategoryGrid({ categories }: { categories: CategoryNode[] }) {
  const t = useTranslations('landing.categories');
  const locale = useLocale() as Locale;

  // The marquee rows: top categories, then their subcategories, all real names in the page language.
  const tops = categories.map((category) => category.names[locale]);
  const subs = categories
    .flatMap((category) => category.children.map((child) => child.names[locale]))
    .slice(0, 12);

  return (
    <>
      {tops.length > 1 ? (
        <div className={`-mx-4 sm:-mx-8 ${MARQUEE_BOX}`}>
          <Marquee decorative rows={subs.length > 1 ? [tops, subs] : [tops]} className="pt-6" />
        </div>
      ) : (
        <div aria-hidden="true" className={MARQUEE_BOX} />
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, index) => (
          <li key={category.id} className={TILTS[index % TILTS.length]}>
            <Tilt className={`relative flex h-full flex-col gap-3 p-6 ${FILL[category.sticker]}`}>
              <span data-bounce="" className="absolute -top-4 -right-3">
                <Sticker kind={STICKERS[index % STICKERS.length]!} size={44} className="rotate-12" />
              </span>
              <h3 className="pr-8 text-2xl leading-tight font-bold text-balance hyphens-auto [overflow-wrap:anywhere]">
                <Link
                  href={categoryLink(category, locale)}
                  className="after:rounded-card after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-3 focus-visible:after:outline-black"
                >
                  {category.names[locale]}
                </Link>
              </h3>
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
            </Tilt>
          </li>
        ))}
      </ul>
    </>
  );
}
