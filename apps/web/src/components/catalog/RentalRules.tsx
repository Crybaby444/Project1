import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * What every rental keeps, under a category's results and on an item page (SEO audit 2026-11-16: thin
 * pages; the rules also answer the first question of someone renting from a stranger).
 */
export async function RentalRules({ name, id = 'rental-rules' }: { name: string; id?: string }) {
  const t = await getTranslations('categoryIntro.about');
  return (
    <section
      aria-labelledby={id}
      className="border-ink/15 mt-10 grid gap-6 border-t pt-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8"
    >
      <h2
        id={id}
        className="font-display text-[clamp(1.6rem,2.6vw,2.4rem)] leading-[0.92] font-black uppercase"
      >
        {t('title', { name })}
      </h2>
      <div className="flex flex-col items-start gap-5">
        <ul className="m-0 grid list-none gap-x-8 gap-y-4 p-0 sm:grid-cols-2">
          {(['a', 'b', 'c', 'd'] as const).map((k) => (
            <li key={k} className="flex gap-3 text-[15px] leading-relaxed">
              <span aria-hidden="true" className="bg-ink mt-[0.6em] size-1.5 flex-none rounded-full" />
              {t(`points.${k}`, { hours: DEFAULT_BOOKING_SETTINGS.inspectionHours })}
            </li>
          ))}
        </ul>
        <Link
          href="/what-is-yoyo"
          className="text-[15px] font-bold underline decoration-1 underline-offset-4"
        >
          {t('more')}
        </Link>
      </div>
    </section>
  );
}
