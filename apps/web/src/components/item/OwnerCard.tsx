import type { OwnerSummary } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { profilePath } from '@/lib/seo';
import { Stars } from '@/components/reviews/Stars';
import { formatScore } from '@/components/reviews/format';

/** "AB" from "Anna Bērziņa", "A" from "Anna", "A" from "@444anna". */
export function initials(name: string): string {
  // `@olga.k` (owner, 2026-11-16: usernames everywhere) gives "O".
  return name
    .replace(/^@/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    // A username that starts with digits ("@444anna") takes its first letter, not "4".
    .map((part) => (part.match(/\p{L}/u)?.[0] ?? Array.from(part)[0] ?? '').toUpperCase())
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
  const answers = answerSpeed(owner.responseMinutes);
  const tr = useTranslations('reviews');
  const locale = useLocale();
  const Heading = heading;
  // On the profile itself (h1) the counts live in the numbers row and the tabs: nothing said twice.
  const profile = heading === 'h1';
  const since = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(owner.memberSince));

  return (
    <div className={`flex flex-col gap-4 ${heading === 'h1' ? '' : 'sheet border-ink/15 rounded-media border p-5'}`}>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="bg-ink text-canvas font-display grid size-14 shrink-0 place-items-center rounded-full text-2xl font-black">
          {initials(owner.name)}
        </span>
        <div className="min-w-0">
          {!profile && <p className="text-xs font-bold tracking-[0.032em] uppercase">{t('label')}</p>}
          <Heading
            className={
              heading === 'h1'
                ? 'font-display text-display-l leading-[0.95] font-black uppercase [overflow-wrap:anywhere]'
                : 'text-xl leading-tight font-bold [overflow-wrap:anywhere]'
            }
          >
            {owner.name}
          </Heading>
          {owner.username && owner.name !== `@${owner.username}` && <p className="text-base font-bold [overflow-wrap:anywhere]" data-username="">@{owner.username}</p>}
          <p className="text-sm">{owner.city ? t('sinceIn', { since, city: owner.city }) : t('since', { since })}</p>
        </div>
      </div>
      <ul className="flex min-w-0 flex-wrap gap-2 text-xs font-bold">
        {owner.identityVerified && (
          <li className="bg-ink text-canvas rounded-pill inline-flex items-center gap-1 px-2.5 py-0.5" data-identity-verified="">
            <Check />
            {t('identityVerified')}
          </li>
        )}
        {owner.emailVerified && (
          <li className="border-ink/25 rounded-pill inline-flex items-center gap-1 border px-2.5 py-0.5">
            <Check />
            {t('emailVerified')}
          </li>
        )}
        {owner.phoneVerified && (
          <li className="border-ink/25 rounded-pill inline-flex items-center gap-1 border px-2.5 py-0.5">
            <Check />
            {t('phoneVerified')}
          </li>
        )}
        {answers && (
          <li className="bg-ink text-canvas rounded-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 before:size-1.5 before:rounded-full before:bg-current before:content-['']">
            {t(`answers.${answers}`)}
          </li>
        )}
        {!profile && <li className="border-ink rounded-pill border px-2.5 py-0.5">{t('deals', { count: owner.completedDeals })}</li>}
        {!profile && <li className="border-ink rounded-pill border px-2.5 py-0.5">{t('items', { count: owner.listingCount })}</li>}
      </ul>
      {owner.rating === null ? (
        profile ? null : <p className="text-sm">{t('noReviews')}</p>
      ) : (
        <p className="m-0 flex items-center gap-2.5 text-sm" data-owner-rating="">
          <span className="font-display text-3xl leading-none font-black tabular-nums" aria-hidden="true">
            {formatScore(owner.rating, locale, true)}
          </span>
          <Stars value={owner.rating} />
          {!profile && <span className="text-ink/75">{tr('count', { count: owner.reviewCount })}</span>}
        </p>
      )}
      {heading === 'h2' && (
        <Link href={profilePath(owner.id)} className="self-start text-sm font-bold underline underline-offset-4">
          {t('profile', { name: owner.name })}
        </Link>
      )}
    </div>
  );
}

/** Their usual answer time in plain steps (Airbnb-style); slower than a day is not advertised. */
export function answerSpeed(minutes: number | null): 'hour' | 'hours' | 'day' | null {
  if (minutes === null) return null;
  if (minutes <= 60) return 'hour';
  if (minutes <= 180) return 'hours';
  if (minutes <= 1440) return 'day';
  return null;
}
