'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useSession } from '@/lib/session/SessionProvider';

const TABS = [
  ['lending', '/dashboard/lending'],
  ['favorites', '/dashboard/favorites'],
  ['following', '/dashboard/following'],
  ['shops', '/dashboard/shops'],
] as const;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

/**
 * "My profile" (owner, 2026-11-16: the account menu keeps only what matters; the rest lives here): who
 * you are, a link to your public profile, and your items, favourites, the people you follow and your
 * shops as tabs. Shown above every /dashboard page.
 */
export function MySpaceNav() {
  const t = useTranslations('mySpace');
  const { user } = useSession();
  const pathname = usePathname();
  if (!user) return null;
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-10 sm:px-8 sm:pt-14" data-my-space="">
      <div className="flex flex-wrap items-center gap-4">
        <span aria-hidden="true" className="bg-ink text-canvas font-display grid size-16 shrink-0 place-items-center rounded-full text-2xl font-black">
          {initials(user.name)}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display truncate text-display-s leading-none font-black uppercase">{user.name}</p>
          <p className="text-ink/75 flex flex-wrap items-center gap-x-3 text-base">
            {user.username && <span>@{user.username}</span>}
            <Link href={`/u/${user.id}`} className="font-bold underline decoration-1 underline-offset-4">
              {t('public')}
            </Link>
          </p>
        </div>
      </div>
      <nav aria-label={t('label')} className="border-ink/15 -mx-4 overflow-x-auto border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex gap-1">
          {TABS.map(([key, href]) => {
            const current = pathname.startsWith(href);
            return (
              <li key={key} className="shrink-0">
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={`relative inline-flex min-h-12 items-center px-4 text-base font-bold whitespace-nowrap transition-colors ${current ? 'text-ink after:bg-ink after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-full' : 'text-ink/65 hover:text-ink'}`}
                >
                  {t(`tabs.${key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
