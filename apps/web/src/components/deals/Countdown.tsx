'use client';

import type { BookingView } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { formatMoment } from '@/lib/deals/dates';
import { useDeadline, type Remaining } from '@/lib/deals/deadline';

/** "1 d 2 h", "2 h 5 min", "4 min 10 s" or "9 s": the two largest units, so it stays short. */
export function useDurationText() {
  const t = useTranslations('countdown');
  return (r: Remaining) =>
    r.days > 0
      ? t('days', { days: r.days, hours: r.hours })
      : r.hours > 0
        ? t('hours', { hours: r.hours, minutes: r.minutes })
        : r.minutes > 0
          ? t('minutes', { minutes: r.minutes, seconds: r.seconds })
          : t('seconds', { seconds: r.seconds });
}

/**
 * What happens by itself, and when: "The request expires in 23 h 59 min". Tabular figures keep the
 * ticking digits the same width, and the line reserves its height, so nothing around it moves.
 * The exact moment is in a <time> for the curious and for assistive tech. When it runs out, `onExpire`
 * reads the deal again (the server's timer has probably moved it on).
 */
export function Countdown({
  deadline,
  timeZone,
  onExpire,
  className = '',
}: {
  deadline: NonNullable<BookingView['deadline']>;
  timeZone: string;
  onExpire?: () => void;
  className?: string;
}) {
  const t = useTranslations('dealTimeline');
  const locale = useLocale();
  const left = useDeadline(deadline.dueAt, onExpire);
  const duration = useDurationText();
  if (!left) return null;

  if (left.overdue) {
    return (
      <p role="status" className={`text-sm font-bold ${className}`}>
        {t('overdue')}
      </p>
    );
  }

  const urgent = left.ms <= 3_600_000;
  return (
    <p data-countdown="" data-urgent={urgent || undefined} className={`flex min-h-6 flex-wrap items-center gap-x-2 text-sm font-bold ${className}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full bg-ink ${urgent ? 'animate-pulse' : ''}`} />
      <span className="tabular-nums">{t(`deadline.${deadline.timer}`, { time: duration(left) })}</span>
      <time dateTime={deadline.dueAt} className="text-ink/80 font-medium">
        ({formatMoment(deadline.dueAt, locale, timeZone)})
      </time>
    </p>
  );
}
