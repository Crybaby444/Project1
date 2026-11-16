import { getTranslations } from 'next-intl/server';
import { SERVICE_FACTS } from '@/lib/site';

const FACTS = {
  requestHours: SERVICE_FACTS.requestHours,
  checkHours: SERVICE_FACTS.checkHours,
  reviewDays: SERVICE_FACTS.reviewDays,
  fee: SERVICE_FACTS.serviceFeePercent,
};

/**
 * The rules every deal keeps (owner, 2026-11-16: no repeats, everything in its one place): the deposit
 * rule with its time limits, changing your mind, reviews and where Yoyo is today. The steps themselves
 * are in TwoSides.
 */
export async function FinePrint() {
  const t = await getTranslations('howItWorks');
  return (
    <section
      data-home="rules"
      aria-labelledby="intro-rules"
      className="bg-canvas text-ink border-ink/15 border-t px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-14">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <h2
            id="intro-rules"
            className="font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.88] font-black uppercase"
          >
            {t('rulesTitle')}
          </h2>
          <p className="text-ink/75 max-w-[46ch] text-[17px] leading-relaxed lg:pb-2">{t('rulesLead')}</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <section
            aria-labelledby="rules-deposit"
            className="flex flex-col gap-5 rounded-[28px] bg-[var(--night)] p-7 text-[var(--paper)] sm:p-10"
          >
            <h3
              id="rules-deposit"
              className="font-display text-[clamp(1.9rem,3vw,2.8rem)] leading-[0.9] font-black uppercase"
            >
              {t('deposit.heading')}
            </h3>
            <p className="m-0 text-[17px] leading-relaxed">{t('deposit.lead')}</p>
            <ol className="m-0 list-none border-t border-[var(--paper)]/15 p-0">
              {(['fine', 'agreed', 'disputed'] as const).map((k, i) => (
                <li
                  key={k}
                  className="grid grid-cols-[2rem_1fr] gap-3 border-b border-[var(--paper)]/15 py-4 text-[15.5px] leading-relaxed"
                >
                  <span aria-hidden="true" className="pt-0.5 text-xs font-bold tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{t(`deposit.${k}`)}</span>
                </li>
              ))}
            </ol>
            <p className="m-0 text-[15px] leading-relaxed text-[var(--paper)]/80">
              {t('deposit.timeouts', FACTS)}
            </p>
            <p className="m-0 text-[15px] leading-relaxed text-[var(--paper)]/80">
              {t('deposit.notReturned')}
            </p>
          </section>
          <div className="flex flex-col gap-3">
            {(['cancel', 'reviews', 'today'] as const).map((k) => (
              <section
                key={k}
                aria-labelledby={`rules-${k}`}
                className="border-ink/15 flex flex-1 flex-col gap-3 rounded-[28px] border p-7"
              >
                <h3
                  id={`rules-${k}`}
                  className="font-display text-[clamp(1.6rem,2.4vw,2.2rem)] leading-[0.9] font-black uppercase"
                >
                  {t(`${k}.heading`)}
                </h3>
                <p className="text-ink/80 m-0 text-[15.5px] leading-relaxed">{t(`${k}.body`, FACTS)}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The steps of each side with the real numbers, for TwoSides (same source as the rules above). */
export async function sideSteps() {
  const t = await getTranslations('howItWorks');
  const RENTER = ['find', 'request', 'contract', 'pay', 'handover', 'return'] as const;
  const OWNER = ['list', 'review', 'accept', 'handover', 'check'] as const;
  return {
    rent: RENTER.map((k) => ({
      title: t(`renter.steps.${k}.title`),
      body: t(`renter.steps.${k}.body`, FACTS),
    })),
    lend: OWNER.map((k) => ({ title: t(`owner.steps.${k}.title`), body: t(`owner.steps.${k}.body`, FACTS) })),
  };
}
