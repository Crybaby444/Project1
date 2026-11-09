import type { OwnerSummary } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Link } from '@/i18n/navigation';
import { profilePath } from '@/lib/seo';

/** "AB" from "Anna Bērziņa", "A" from "Anna". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toUpperCase() ?? '')
    .join('');
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Who lends the item, as everyone may see them (no email, no phone): initials, name, city, on Yoyo
 * since, what is confirmed, finished deals, and the reviews' place (reviews arrive with plan 10).
 */
export function OwnerCard({ owner, heading = 'h2' }: { owner: OwnerSummary; heading?: 'h2' | 'h1' }) {
  const t = useTranslations('item.owner');
  const locale = useLocale();
  const Heading = heading;
  const since = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(owner.memberSince));

  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="bg-sticker-lavender grid size-14 shrink-0 place-items-center rounded-full border border-black text-lg font-bold text-black">
          {initials(owner.name)}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.032em] uppercase">{t('label')}</p>
          <Heading className="text-xl leading-tight font-bold [overflow-wrap:anywhere]">{owner.name}</Heading>
          <p className="text-sm">{owner.city ? t('sinceIn', { since, city: owner.city }) : t('since', { since })}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2 text-xs font-bold">
        {owner.emailVerified && (
          <li className="bg-sticker-mint rounded-pill inline-flex items-center gap-1 border border-black px-2.5 py-0.5 text-black">
            <Check />
            {t('emailVerified')}
          </li>
        )}
        {owner.phoneVerified && (
          <li className="bg-sticker-mint rounded-pill inline-flex items-center gap-1 border border-black px-2.5 py-0.5 text-black">
            <Check />
            {t('phoneVerified')}
          </li>
        )}
        <li className="border-ink rounded-pill border px-2.5 py-0.5">{t('deals', { count: owner.completedDeals })}</li>
        <li className="border-ink rounded-pill border px-2.5 py-0.5">{t('items', { count: owner.listingCount })}</li>
      </ul>
      <p className="text-sm">{owner.rating === null ? t('noReviews') : t('rating', { rating: owner.rating.toFixed(1) })}</p>
      {heading === 'h2' && (
        <Link href={profilePath(owner.id)} className="self-start text-sm font-bold underline underline-offset-4">
          {t('profile', { name: owner.name })}
        </Link>
      )}
    </Card>
  );
}
