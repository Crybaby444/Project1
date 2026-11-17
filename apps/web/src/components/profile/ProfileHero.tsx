import type { PublicProfile } from '@yoyo/shared';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { answerSpeed, initials } from '@/components/item/OwnerCard';
import { ProfileSocial } from '@/components/people/ProfileSocial';

function Mark({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className={`rounded-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold ${strong ? 'bg-[var(--paper)] text-[var(--night)]' : 'border border-[var(--paper)]/30'}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5">
        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </li>
  );
}

/**
 * The top of a profile (owner, 2026-11-16: "make the profile much more beautiful"): a night band with
 * the one blue light, the person's mark, their @username as the title, where they are and since when,
 * what is confirmed, and the numbers and actions (ProfileSocial). One place for each fact.
 */
export async function ProfileHero({ user }: { user: PublicProfile['user'] }) {
  const t = await getTranslations('item.owner');
  const tp = await getTranslations('profile.hero');
  const locale = await getLocale();
  const format = await getFormatter();
  const since = format.dateTime(new Date(user.memberSince), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const answers = answerSpeed(user.responseMinutes);
  return (
    <section
      aria-labelledby="profile-name"
      className="rounded-media relative isolate overflow-hidden bg-[var(--night)] px-5 py-8 text-[var(--paper)] sm:px-10 sm:py-12"
      data-profile-hero=""
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-1/3 right-[-10%] -z-10 size-[42rem] rounded-full bg-[radial-gradient(closest-side,rgba(77,124,255,0.45),transparent)]" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
          <span aria-hidden="true" className="font-display grid size-24 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-4xl font-black text-[var(--night)] sm:size-32 sm:text-5xl">
            {initials(user.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-3">
            <h1 id="profile-name" className="font-display text-display-l leading-[0.88] font-black [overflow-wrap:anywhere]" lang={locale}>
              {user.name}
            </h1>
            <p className="text-base text-[var(--paper)]/75">{user.city ? `${user.city} · ${tp('memberSince', { since })}` : tp('memberSince', { since })}</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {user.identityVerified && <Mark strong>{t('identityVerified')}</Mark>}
              {user.emailVerified && <Mark>{t('emailVerified')}</Mark>}
              {user.phoneVerified && <Mark>{t('phoneVerified')}</Mark>}
              {answers && <Mark>{t(`answers.${answers}`)}</Mark>}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-1 lg:items-end lg:text-right">
          <span className="text-xs font-bold tracking-[0.06em] text-[var(--paper)]/60 uppercase">{tp('rating')}</span>
          {user.rating === null ? (
            <span className="text-lg font-bold">{tp('noRating')}</span>
          ) : (
            <span className="font-display text-display-m leading-none font-black tabular-nums">{format.number(user.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}★</span>
          )}
        </div>
      </div>
      <div className="mt-8 border-t border-[var(--paper)]/15 pt-6">
        <ProfileSocial userId={user.id} name={user.name} followers={user.followers ?? 0} following={user.following ?? 0} reviews={user.reviewCount} deals={user.completedDeals} tone="night" />
      </div>
    </section>
  );
}
