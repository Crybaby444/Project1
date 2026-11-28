'use client';

import type { BookingHistoryItem, BookingView } from '@yoyo/shared';
import { useLocale, useNow, useTranslations } from 'next-intl';
import { dateLocale, formatMoment, plainDates } from '@/lib/deals/dates';
import { addDays, todayIn } from '@/lib/listings/calendar';
import { dealTimeline, type StepState } from '@/lib/deals/timeline';
import { Countdown } from './Countdown';
import { Sheet } from '@/components/ui/Sheet';

const DOT: Record<StepState, string> = {
  done: 'bg-ink text-canvas border-ink',
  // Where the deal is now: the blue, with its light around it.
  current: 'bg-accent text-accent-fg border-accent shadow-[0_0_0_5px_var(--accent-soft)]',
  upcoming: 'bg-surface text-ink border-ink/40',
  stopped: 'bg-mist text-ink border-ink',
  skipped: 'bg-surface text-ink/50 border-ink/20 border-dashed',
};

function Mark({ state }: { state: StepState }) {
  const path =
    state === 'done'
      ? 'm6 12.5 4 4L18 8.5'
      : state === 'stopped'
        ? 'M8 8l8 8M16 8l-8 8'
        : state === 'current'
          ? 'M12 7v5l3 2'
          : '';
  return (
    <span
      aria-hidden="true"
      data-step-mark={state}
      className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border ${DOT[state]}`}
    >
      {path ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={path} />
        </svg>
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
    </span>
  );
}

/**
 * The deal's whole path (spec §4.4): every step with its state and time, the current one with what
 * happens next and when (a countdown when a deadline is armed). An ordered list; the current step has
 * aria-current="step". The ink line between steps fills as the deal moves (a transform, never a size).
 */
export function DealTimeline({
  booking,
  history,
  onDeadline,
}: {
  booking: BookingView;
  history: BookingHistoryItem[];
  onDeadline(): void;
}) {
  const t = useTranslations('dealTimeline');
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  // Paid with the first day still ahead: the handover is "the day", not "now" (the page's own heading says
  // the deal waits for the handover day; the step agrees and names it).
  const handoverAhead = booking.status === 'PAID' && todayIn(booking.timeZone, now) < addDays(booking.period.start, -1);
  const firstDay = plainDates(
    new Intl.DateTimeFormat(dateLocale(locale), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${booking.period.start}T00:00:00Z`)),
  );
  const steps = dealTimeline(booking, history);

  return (
    <Sheet aria-labelledby="deal-timeline" className="flex flex-col gap-4">
      <h2 id="deal-timeline" className="type-block">
        {t('title')}
      </h2>
      <ol className="flex flex-col" data-timeline="">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          const behind = step.state === 'done';
          const title =
            step.key === 'end' && step.state !== 'upcoming' ? t(`ended.${booking.status as 'COMPLETED'}`) : t(`step.${step.key}`);
          return (
            <li
              key={step.key}
              aria-current={step.state === 'current' ? 'step' : undefined}
              data-step={step.key}
              data-state={step.state}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              {!last && (
                <span aria-hidden="true" className="bg-ink/15 absolute top-8 bottom-0 left-[15px] w-0.5 overflow-hidden">
                  <span
                    className={`bg-accent ease-yoyo block h-full w-full origin-top transition-transform duration-450 ${behind ? 'scale-y-100' : 'scale-y-0'}`}
                  />
                </span>
              )}
              <Mark state={step.state} />
              <div className={`flex min-w-0 flex-1 flex-col gap-1 pt-1 ${step.state === 'skipped' ? 'opacity-60' : ''}`}>
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className={`font-bold [overflow-wrap:anywhere] ${step.state === 'skipped' ? 'line-through' : ''}`}>{title}</span>
                  <span className="type-caption">
                    <span className="sr-only">, </span>
                    {step.key === 'handover' && step.state === 'current' && handoverAhead ? firstDay : t(`state.${step.state}`)}
                  </span>
                  {step.at && (step.state === 'done' || step.state === 'stopped') && (
                    <time dateTime={step.at} className="text-sm">
                      {formatMoment(step.at, locale, booking.timeZone)}
                    </time>
                  )}
                </p>
                {step.state === 'current' && step.key !== 'request' && step.key !== 'end' && (
                  <div className="animate-step-in flex flex-col gap-1">
                    <p className="text-sm">
                      {step.key === 'handover' && handoverAhead ? t('hint.handoverAhead', { day: firstDay }) : t(`hint.${step.key}`)}
                    </p>
                    <Countdown booking={booking} onExpire={onDeadline} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
