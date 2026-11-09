'use client';

import type { DatePeriod } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { dateLocale } from '@/lib/deals/dates';
import { addDays, isUnavailable, monthGrid, weekStartFor } from '@/lib/listings/calendar';
import { monthLabel } from '@/lib/month-label';

export type Range = { start: string; end: string | null };

type Month = { year: number; month: number };

const monthOf = (day: string): Month => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) });
const shiftMonth = ({ year, month }: Month, by: number): Month => {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};
const monthKey = ({ year, month }: Month) => `${year}-${String(month).padStart(2, '0')}`;
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** Whether a taken day lies between `start` and `end` (both included). */
export function crossesTaken(blocked: DatePeriod[], start: string, end: string): boolean {
  return blocked.some((period) => period.start <= end && period.end >= start);
}

/**
 * The next range after a click on `day`: the first click (or a click before the start, or after a
 * finished range) starts a new range; the second sets its end.
 */
export function nextRange(range: Range | null, day: string): Range {
  if (!range || range.end !== null || day < range.start) return { start: day, end: null };
  return { start: range.start, end: day };
}

function useTwoMonths(allowed: boolean): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (!allowed) return;
    const query = window.matchMedia?.('(min-width: 768px)');
    if (!query) return;
    const update = () => setWide(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, [allowed]);
  return allowed && wide;
}

/**
 * Rental days as a date grid (one month on a phone, two on wider screens). Taken and past days are
 * struck through and cannot be picked; the chosen range is filled, its ends are ink pills. Keyboard:
 * arrows by a day or a week, Page Up/Down by a month, Enter or Space picks. Every day button says in
 * words whether it is taken, the first, the last or inside the range, so colour is never the only sign.
 */
export function DateRangePicker({
  today,
  lastDay,
  blocked,
  range,
  onChange,
  describedBy,
  oneMonth = false,
}: {
  today: string;
  /** The latest day a rental may start or run to (today + maxAdvanceDays). */
  lastDay: string;
  blocked: DatePeriod[];
  range: Range | null;
  onChange(range: Range): void;
  describedBy?: string;
  /** Always one month, for a narrow column (the item page's side column). */
  oneMonth?: boolean;
}) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const keysId = useId();
  const twoMonths = useTwoMonths(!oneMonth);
  const [view, setView] = useState<Month>(() => monthOf(range?.start ?? today));
  const [focused, setFocused] = useState(range?.start ?? today);
  const moveFocus = useRef(false);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const weekStart = weekStartFor(locale);
  const months = twoMonths ? [view, shiftMonth(view, 1)] : [view];
  const intl = dateLocale(locale);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    buttons.current.get(focused)?.focus();
  }, [focused, view]);

  const dayLabel = new Intl.DateTimeFormat(intl, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const monthHeading = monthLabel(intl);
  const weekdayShort = new Intl.DateTimeFormat(intl, { weekday: 'narrow', timeZone: 'UTC' });
  const weekdayLong = new Intl.DateTimeFormat(intl, { weekday: 'long', timeZone: 'UTC' });

  const unavailable = (day: string) => day < today || day > lastDay || isUnavailable(blocked, day);

  function goTo(day: string) {
    const first = monthKey(view);
    const last = monthKey(months.at(-1)!);
    if (day.slice(0, 7) < first) setView(monthOf(day));
    else if (day.slice(0, 7) > last) setView(shiftMonth(monthOf(day), -(months.length - 1)));
    moveFocus.current = true;
    setFocused(day);
  }

  function pick(day: string) {
    if (unavailable(day)) return;
    setFocused(day);
    onChange(nextRange(range, day));
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const steps: Record<string, () => string> = {
      ArrowLeft: () => addDays(day, -1),
      ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7),
      ArrowDown: () => addDays(day, 7),
      PageUp: () => addDays(day, -28),
      PageDown: () => addDays(day, 28),
    };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      const next = step();
      if (next.slice(0, 7) >= today.slice(0, 7) && next.slice(0, 7) <= lastDay.slice(0, 7)) goTo(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pick(day);
    }
  }

  const end = range?.end ?? null;
  const header = monthGrid(view.year, view.month, weekStart)[0]!;

  return (
    <div className="flex flex-col gap-3" data-date-range="">
      <p id={keysId} className="sr-only">
        {t('calendar.keys')}
      </p>
      <div className="flex items-center justify-between gap-3">
        <IconButton
          label={t('calendar.previous')}
          onClick={() => setView(shiftMonth(view, -1))}
          disabled={monthKey(view) <= today.slice(0, 7)}
        >
          <span aria-hidden="true">←</span>
        </IconButton>
        <IconButton
          label={t('calendar.next')}
          onClick={() => setView(shiftMonth(view, 1))}
          disabled={monthKey(months.at(-1)!) >= lastDay.slice(0, 7)}
        >
          <span aria-hidden="true">→</span>
        </IconButton>
      </div>
      <div className={`grid gap-6 ${twoMonths ? 'md:grid-cols-2' : ''}`}>
        {months.map((month) => {
          const captionId = `${keysId}-${monthKey(month)}`;
          return (
            <table key={monthKey(month)} role="grid" aria-labelledby={captionId} className="w-full table-fixed border-collapse">
              <caption id={captionId} className="pb-2 text-left text-lg font-bold capitalize">
                {monthHeading.format(asDate(`${monthKey(month)}-01`))}
              </caption>
              <thead>
                <tr>
                  {header.map(({ date }) => (
                    <th key={date} scope="col" className="pb-1 text-xs font-bold uppercase">
                      <abbr title={weekdayLong.format(asDate(date))} className="no-underline">
                        {weekdayShort.format(asDate(date))}
                      </abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthGrid(month.year, month.month, weekStart).map((week) => (
                  <tr key={week[0]!.date}>
                    {week.map(({ date, inMonth }) => {
                      if (!inMonth) return <td key={date} role="gridcell" />;
                      const off = unavailable(date);
                      const taken = isUnavailable(blocked, date) && date >= today;
                      const isStart = range?.start === date;
                      const isEnd = end === date;
                      const inside = end !== null && range !== null && date > range.start && date < end;
                      const state = isStart && isEnd ? `${t('first')}, ${t('last')}` : isStart ? t('first') : isEnd ? t('last') : inside ? t('inRange') : '';
                      const label = [dayLabel.format(asDate(date)), taken ? t('taken') : off ? t('past') : '', state].filter(Boolean).join(', ');
                      return (
                        <td
                          key={date}
                          role="gridcell"
                          aria-selected={isStart || isEnd || inside}
                          className={`p-0.5 ${inside ? 'bg-sticker-lavender/70' : ''} ${isStart && end ? 'rounded-l-full bg-sticker-lavender/70' : ''} ${isEnd && !isStart ? 'rounded-r-full bg-sticker-lavender/70' : ''}`}
                        >
                          <button
                            ref={(element) => {
                              if (element) buttons.current.set(date, element);
                              else buttons.current.delete(date);
                            }}
                            type="button"
                            tabIndex={date === focused ? 0 : -1}
                            aria-label={label}
                            aria-disabled={off || undefined}
                            aria-describedby={[keysId, describedBy].filter(Boolean).join(' ')}
                            onClick={() => pick(date)}
                            onKeyDown={(event) => onKeyDown(event, date)}
                            onFocus={() => setFocused(date)}
                            data-date={date}
                            data-range-end={isStart || isEnd || undefined}
                            className={`ease-yoyo grid aspect-square min-h-10 w-full place-items-center rounded-full border text-sm font-bold tabular-nums transition-[transform,background-color,color] duration-150 ${
                              off
                                ? `text-ink/55 cursor-not-allowed border-transparent ${taken ? 'line-through decoration-2' : ''}`
                                : isStart || isEnd
                                  ? 'border-cta bg-cta text-cta-fg scale-105'
                                  : inside
                                    ? 'border-transparent text-black hover:-translate-y-0.5'
                                    : 'border-ink/25 hover:border-ink hover:-translate-y-0.5 active:scale-[0.96]'
                            } ${date === today ? 'outline-ink outline-1 outline-offset-1 outline-dashed' : ''}`}
                          >
                            {Number(date.slice(8, 10))}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </div>
  );
}
