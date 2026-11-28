import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const STEPS = ['find', 'sign', 'meet', 'back'] as const;

/** The step's line icon (24-unit grid, round caps, one stroke weight). */
function Icon({ step }: { step: (typeof STEPS)[number] }) {
  const path = {
    find: <><circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4" /></>,
    sign: <><path d="M4 19c3-.5 4.5-3 6-6s3-6 5-6 1.5 3-1 5-4 4-2 5 4-2 5-2 1 2 3 2" /></>,
    meet: <><path d="M4 9h16v10H4z" /><path d="M9 9V6.5a3 3 0 0 1 6 0V9" /></>,
    back: <><path d="M8 7 4 11l4 4" /><path d="M4 11h10a5 5 0 0 1 0 10h-2" /></>,
  }[step];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
      {path}
    </svg>
  );
}

/**
 * How it works in four steps on a string, as the big marketplaces explain themselves on the home (owner,
 * 2026-11-28): find it, sign before paying, meet and take it, bring it back. The string runs across on a
 * desktop and down on a phone; the last bead is the blue one, because that is the promise: it comes back.
 */
export async function HowItWorks() {
  const t = await getTranslations('market.how');
  return (
    <section aria-labelledby="home-how" className="page stack-section pt-20 sm:pt-28" data-how-it-works="">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="home-how" className="type-section">
          {t('title')}
        </h2>
        <Link href="/what-is-yoyo" className="text-base font-bold underline decoration-1 underline-offset-4">
          {t('more')}
        </Link>
      </div>
      <ol className="relative m-0 grid list-none gap-8 p-0 pt-2 lg:grid-cols-4 lg:gap-6">
        {/* The string: down the left on a phone, across on a desktop. */}
        <span aria-hidden="true" className="bg-ink/25 absolute top-8 bottom-8 left-[1.375rem] w-[1.5px] lg:top-[2.125rem] lg:right-[12%] lg:bottom-auto lg:left-6 lg:h-[1.5px] lg:w-auto" />
        {STEPS.map((step, index) => {
          const last = index === STEPS.length - 1;
          return (
            <li key={step} className="relative flex gap-5 lg:flex-col lg:gap-5">
              <span
                aria-hidden="true"
                className={`relative grid size-11 shrink-0 place-items-center rounded-full border ${
                  last ? 'bg-accent text-accent-fg border-accent shadow-[0_0_0_6px_var(--accent-soft)]' : 'bg-canvas border-ink/30 text-ink'
                } lg:mt-3`}
              >
                <Icon step={step} />
              </span>
              <span className="flex flex-col gap-1.5 pt-1 lg:pt-0">
                <span className="font-display text-[1.75rem] leading-[0.95] font-black uppercase">{t(`steps.${step}.title`)}</span>
                <span className="text-ink/70 max-w-[30ch] text-base leading-snug">{t(`steps.${step}.body`)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
