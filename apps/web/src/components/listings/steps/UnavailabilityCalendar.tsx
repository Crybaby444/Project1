'use client';

import type { DatePeriod } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import {
  addDays,
  isUnavailable,
  monthGrid,
  toggleDay,
  toggleRange,
  weekStartFor,
} from '@/lib/listings/calendar';
import { monthLabel } from '@/lib/month-label';

type Props = {
  periods: DatePeriod[];
  /** Today where the listing is (`YYYY-MM-DD`); earlier days cannot be marked. */
  today: string;
  onChange(periods: DatePeriod[]): void;
  readOnly: boolean;
};

type Month = { year: number; month: number };

const monthOf = (day: string): Month => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) });
const shiftMonth = ({ year, month }: Month, by: number): Month => {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};
const monthKey = ({ year, month }: Month) => `${year}-${String(month).padStart(2, '0')}`;
/** The same day of another month, or its last day when that month is shorter. */
function sameDayIn(day: string, target: Month): string {
  const wanted = Number(day.slice(8, 10));
  const last = Number(addDays(`${monthKey(shiftMonth(target, 1))}-01`, -1).slice(8, 10));
  return `${monthKey(target)}-${String(Math.min(wanted, last)).padStart(2, '0')}`;
}
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
/** Intl puts thin spaces around the dash of a range; plain spaces read and wrap the same everywhere. */
const plainSpaces = (text: string) => text.replace(/[  ]/g, ' ');

/** Whether the screen is wide enough for two months side by side. */
function useTwoMonths(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.('(min-width: 768px)');
    if (!query) return;
    const update = () => setWide(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return wide;
}

/**
 * The days a listing is not available, as a date grid (one month on a phone, two on wider screens).
 * Keyboard: arrows move by a day or a week, Home/End to the week's ends, Page Up/Down by a month,
 * Enter or Space marks or clears a day, with Shift the period from the last day marked. Marked days
 * are pressed buttons, struck through and named "not available", so colour is never the only sign.
 */
export function UnavailabilityCalendar({ periods, today, onChange, readOnly }: Props) {
  const t = useTranslations('builder.calendar');
  const locale = useLocale();
  const keysId = useId();
  const twoMonths = useTwoMonths();
  const [view, setView] = useState<Month>(() => monthOf(today));
  const [focused, setFocused] = useState(today);
  const [anchor, setAnchor] = useState<string | null>(null);
  const moveFocus = useRef(false);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const weekStart = weekStartFor(locale);
  const months = twoMonths ? [view, shiftMonth(view, 1)] : [view];
  const firstMonth = monthKey(view);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    buttons.current.get(focused)?.focus();
  }, [focused, view]);

  const dayLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const monthHeading = monthLabel(locale);
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  const rangeLabel = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const describe = (period: DatePeriod) =>
    plainSpaces(
      period.start === period.end
        ? rangeLabel.format(asDate(period.start))
        : rangeLabel.formatRange(asDate(period.start), asDate(period.end)),
    );

  function goTo(day: string) {
    const lastShown = monthKey(months.at(-1)!);
    if (day.slice(0, 7) < firstMonth) setView(monthOf(day));
    else if (day.slice(0, 7) > lastShown) setView(shiftMonth(monthOf(day), -(months.length - 1)));
    moveFocus.current = true;
    setFocused(day);
  }

  function mark(day: string, withShift: boolean) {
    if (readOnly || day < today) return;
    onChange(withShift && anchor ? toggleRange(periods, anchor, day) : toggleDay(periods, day));
    setAnchor(day);
    setFocused(day);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const position = (weekday: number) => (weekday - weekStart + 7) % 7;
    const steps: Record<string, () => string> = {
      ArrowLeft: () => addDays(day, -1),
      ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7),
      ArrowDown: () => addDays(day, 7),
      Home: () => addDays(day, -position(asDate(day).getUTCDay())),
      End: () => addDays(day, 6 - position(asDate(day).getUTCDay())),
      PageUp: () => sameDayIn(day, shiftMonth(monthOf(day), -1)),
      PageDown: () => sameDayIn(day, shiftMonth(monthOf(day), 1)),
    };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      goTo(step());
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      mark(day, event.shiftKey);
    }
  }

  const header = monthGrid(view.year, view.month, weekStart)[0]!;

  return (
    <div className="flex flex-col gap-4">
      <p id={keysId} className="sr-only">
        {t('keys')}
      </p>
      <div className="flex items-center justify-between gap-3">
        <IconButton
          label={t('previous')}
          onClick={() => setView(shiftMonth(view, -1))}
          disabled={firstMonth <= today.slice(0, 7)}
        >
          <span aria-hidden="true">←</span>
        </IconButton>
        <IconButton label={t('next')} onClick={() => setView(shiftMonth(view, 1))}>
          <span aria-hidden="true">→</span>
        </IconButton>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {months.map((month) => {
          const captionId = `${keysId}-${monthKey(month)}`;
          return (
            <table
              key={monthKey(month)}
              role="grid"
              aria-labelledby={captionId}
              className="w-full table-fixed border-separate border-spacing-1"
            >
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
                      const past = date < today;
                      const off = isUnavailable(periods, date);
                      const label = `${dayLabel.format(asDate(date))}${off ? `, ${t('unavailable')}` : ''}${past ? `, ${t('past')}` : ''}`;
                      return (
                        <td key={date} role="gridcell" className="p-0">
                          <button
                            ref={(element) => {
                              if (element) buttons.current.set(date, element);
                              else buttons.current.delete(date);
                            }}
                            type="button"
                            tabIndex={date === focused ? 0 : -1}
                            aria-label={label}
                            aria-pressed={off}
                            aria-disabled={past || readOnly || undefined}
                            aria-describedby={keysId}
                            onClick={(event: MouseEvent<HTMLButtonElement>) => mark(date, event.shiftKey)}
                            onKeyDown={(event) => onKeyDown(event, date)}
                            onFocus={() => setFocused(date)}
                            className={`ease-yoyo grid aspect-square min-h-10 w-full place-items-center rounded-full border text-sm font-bold tabular-nums transition-[transform,background-color] duration-150 ${
                              past
                                ? 'text-ink/60 cursor-default border-transparent'
                                : off
                                  ? 'bg-mist border-ink line-through decoration-2 hover:-translate-y-0.5 active:scale-[0.96]'
                                  : 'border-ink/30 hover:border-ink hover:-translate-y-0.5 active:scale-[0.96]'
                            } ${date === today ? 'outline-ink outline-1 outline-dashed' : ''}`}
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
      {periods.length === 0 ? (
        <p className="text-sm">{t('none')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p id={`${keysId}-list`} className="text-[13px] font-bold tracking-[0.03em] uppercase">
            {t('list')}
          </p>
          <ul aria-labelledby={`${keysId}-list`} className="flex flex-wrap gap-2">
            {periods.map((period) => (
              <li
                key={period.start}
                className="border-ink bg-mist rounded-pill inline-flex items-center gap-1 border py-1 pr-1 pl-3 text-sm font-bold"
              >
                {describe(period)}
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={t('remove', { period: describe(period) })}
                    onClick={() => onChange(periods.filter((other) => other !== period))}
                    className="ease-yoyo hover:bg-surface grid size-8 place-items-center rounded-full transition-transform duration-150 active:scale-[0.96]"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5">
                      <path
                        d="m7 7 10 10M17 7 7 17"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
