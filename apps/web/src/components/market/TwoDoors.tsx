import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LIST_ITEM_HREF } from '@/lib/site';

/**
 * Two doors at the foot of the home, always night: one for who needs a thing, one for who has it, and the way
 * to the whole story (What is Yoyo).
 */
export async function TwoDoors() {
  const t = await getTranslations('market.doors');
  const doors = [
    { key: 'need', href: '/c' },
    ...(LIST_ITEM_HREF ? [{ key: 'have', href: LIST_ITEM_HREF }] : []),
  ] as const;
  return (
    <section aria-labelledby="home-doors" className="bg-[var(--night)] px-4 py-20 text-[var(--paper)] sm:px-8 sm:py-28">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10">
        <h2 id="home-doors" className="font-display max-w-[14em] text-display-l leading-[0.88] font-black uppercase">
          {t('title')}
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {doors.map((d) => (
            <Link
              key={d.key}
              href={d.href}
              className="group relative flex min-h-[15rem] flex-col justify-between gap-8 overflow-hidden rounded-[28px] border border-[var(--paper)]/20 p-7 transition-colors duration-500 hover:bg-[var(--paper)] hover:text-[var(--night)] sm:p-10"
            >
              <span className="text-sm font-bold opacity-75">{t(`${d.key}.who`)}</span>
              <span className="flex items-end justify-between gap-6">
                <span className="flex flex-col gap-3">
                  <span className="font-display text-display-m leading-[0.88] font-black uppercase">{t(`${d.key}.title`)}</span>
                  <span className="max-w-[40ch] text-base leading-relaxed opacity-80">{t(`${d.key}.body`)}</span>
                </span>
                <span aria-hidden="true" className="grid size-14 flex-none place-items-center rounded-full bg-[var(--paper)] text-[var(--night)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[-45deg] group-hover:bg-[var(--night)] group-hover:text-[var(--paper)]">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </span>
            </Link>
          ))}
        </div>
        <Link href="/what-is-yoyo" className="self-start text-base font-bold underline decoration-1 underline-offset-4">
          {t('story')}
        </Link>
      </div>
    </section>
  );
}
