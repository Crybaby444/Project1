import type { CatalogItem, Locale } from '@yoyo/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { Mark } from '@/components/brand/Mark';
import { Link } from '@/i18n/navigation';
import { cents, formatMoney } from '@yoyo/domain';
import { listingPath } from '@/lib/seo';
import { SwingRow } from './SwingRow';

/** Each tag hangs on its own length of thread and leans a little its own way. */
const THREADS = [34, 58, 22, 46, 30, 62, 26, 50] as const;
const thread = (i: number) => THREADS[i % THREADS.length] ?? 30;
const TILTS = [-3, 2, -1.5, 3.5, -2.5, 1.5, -3.5, 2.5] as const;
const tilt = (i: number) => TILTS[i % TILTS.length] ?? 0;

/**
 * The home's signature (owner, 2026-11-16): the newest real items hang as price tags on the yo-yo's string
 * across the page — the day's price large, the deposit with the one light, because it comes back. The
 * tags sway on their threads (CSS only; still under reduced motion). On a phone the string scrolls sideways.
 */
/** Euros in the reader's language (server side; lib/deals/money is a client module). */
const money = (amount: number, locale: string) => formatMoney(cents(amount), locale as Locale).replace(/[\u00a0\u202f]/g, ' ');
/** The day's price on a tag: whole euros without the cents (35 €), cents only when there are some. */
const price = (amount: number, locale: string) =>
  amount % 100 === 0 ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount / 100).replace(/[\u00a0\u202f]/g, ' ') : money(amount, locale);

export async function TagString({ items }: { items: CatalogItem[] }) {
  const t = await getTranslations('market.tags');
  const locale = await getLocale();
  if (items.length === 0) return null;
  return (
    <section aria-label={t('label')} className="relative" data-tag-string="">
      {/* The string: from the yo-yo on the left edge across the whole page. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-6">
        <svg viewBox="0 0 1000 24" preserveAspectRatio="none" className="text-ink/70 absolute inset-0 size-full overflow-visible">
          <path d="M0 4 Q 500 22 1000 4" fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute top-0 -left-1 -translate-y-1/3 sm:left-2">
          <Mark size={30} />
        </span>
      </div>
      <SwingRow className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pt-3 pb-12 [scrollbar-width:none] sm:gap-6 sm:px-8 min-[1560px]:justify-center [&::-webkit-scrollbar]:hidden">
        {items.slice(0, 6).map((item, i) => (
          <li key={item.id} className="w-[212px] shrink-0 snap-start" style={{ paddingTop: `${thread(i)}px` }}>
            <div
              className="yoyo-sway origin-[50%_-40px] drop-shadow-[0_18px_22px_rgba(10,11,14,0.22)] motion-reduce:animate-none"
              style={{ '--tilt': `${tilt(i)}deg`, animationDelay: `${i * -0.7}s` } as React.CSSProperties}
            >
              {/* The thread from the string down to the tag's hole. */}
              <span aria-hidden="true" className="bg-ink/55 absolute left-1/2 w-px -translate-x-1/2" style={{ bottom: '100%', height: `${thread(i) + 14}px` }} />
              <Link
                href={listingPath(item.id, item.title)}
                className="group bg-surface relative flex flex-col overflow-hidden rounded-b-[18px] transition-transform duration-300 [clip-path:polygon(22px_0,calc(100%-22px)_0,100%_22px,100%_100%,0_100%,0_22px)] hover:-translate-y-1"
              >
                <span aria-hidden="true" className="bg-canvas absolute top-3 left-1/2 z-10 size-4 -translate-x-1/2 rounded-full shadow-[inset_0_1px_2px_rgba(10,11,14,0.35)]" />
                <span className="bg-mist relative block aspect-[4/3] overflow-hidden">
                  {item.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the API's sized photo
                    <img src={item.cover.card} alt="" loading={i < 3 ? 'eager' : 'lazy'} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : null}
                </span>
                <span className="flex flex-col gap-1.5 p-3.5">
                  <span className="line-clamp-2 min-h-[2.5em] text-[14px] leading-tight font-semibold">{item.title}</span>
                  <span className="flex items-baseline gap-1">
                    <span className="font-display text-[2rem] leading-none font-black tabular-nums">{price(item.dailyCents, locale)}</span>
                    <span className="text-ink/70 text-[12px] font-semibold">{t('perDay')}</span>
                  </span>
                  <span className="text-ink/75 flex items-center gap-1.5 text-[12px] font-semibold">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--glow)] ring-1 ring-black/25" />
                    {t('depositBack', { amount: price(item.depositCents, locale) })}
                  </span>
                </span>
              </Link>
            </div>
          </li>
        ))}
      </SwingRow>
    </section>
  );
}
