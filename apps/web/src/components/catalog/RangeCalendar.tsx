'use client';

import type { DatePeriod } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { dayRole, isBlockedDay, pickDay, type Range } from '@/lib/catalog/range';
import { addDays, monthGrid, weekStartFor } from '@/lib/listings/calendar';

type Month = { year: number; month: number };

const monthOf = (day: string): Month => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) });
const shiftMonth = ({ year, month }: Month, by: number): Month => {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};
const monthKey = ({ year, month }: Month) => `${year}-${String(month).padStart(2, '0')}`;
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
function sameDayIn(day: string, target: Month): string {
  const wanted = Number(day.slice(8, 10));
  const last = Number(addDays(`${monthKey(shiftMonth(target, 1))}-01`, -1).slice(8, 10));
  return `${monthKey(target)}-${String(Math.min(wanted, last)).padStart(2, '0')}`;
}

function useTwoMonths(enabled: boolean): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const query = window.matchMedia?.('(min-width: 768px)');
    if (!query) return;
    const update = () => setWide(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, [enabled]);
  return enabled && wide;
}

type Props = {
  value: Range | null;
  onChange(range: Range): void;
  /** `YYYY-MM-DD`; earlier days cannot be picked. */
  today: string;
  /** The last day that can be picked (how far ahead a rental may start). */
  lastDay?: string;
  /** Taken days: struck through, not pickable, and a period cannot cross them. */
  blocked?: DatePeriod[];
  /** Two months side by side on wider screens. */
  twoMonths?: boolean;
};

/**
 * A period picker as a date grid (WAI-ARIA grid, like the builder's calendar of plan 6b): click or
 * Enter the first day, then the last. Arrows move by a day or a week, Home/End to the week's ends,
 * Page Up/Down by a month. Taken days are struck through and named "taken"; the chosen days are
 * pressed buttons filled and outlined, the ends named "start" and "end", so colour is never the only sign.
 */
export function RangeCalendar({ value, onChange, today, lastDay, blocked = [], twoMonths = true }: Props) {
  const t = useTranslations('rangeCalendar');
  const locale = useLocale();
  const keysId = useId();
  const wide = useTwoMonths(twoMonths);
  const [view, setView] = useState<Month>(() => monthOf(value?.start ?? today));
  const [focused, setFocused] = useState(value?.start ?? today);
  const [hover, setHover] = useState<string | null>(null);
  const moveFocus = useRef(false);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const weekStart = weekStartFor(locale);
  const months = wide ? [view, shiftMonth(view, 1)] : [view];
  const firstMonth = monthKey(view);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    buttons.current.get(focused)?.focus();
  }, [focused, view]);

  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });

  const unavailable = (day: string) => day < today || (lastDay !== undefined && day > lastDay) || isBlockedDay(blocked, day);

  function goTo(day: string) {
    const lastShown = monthKey(months.at(-1)!);
    if (day.slice(0, 7) < firstMonth) setView(monthOf(day));
    else if (day.slice(0, 7) > lastShown) setView(shiftMonth(monthOf(day), -(months.length - 1)));
    moveFocus.current = true;
    setFocused(day);
  }

  function choose(day: string) {
    if (unavailable(day)) return;
    onChange(pickDay(value, day, blocked));
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
      choose(day);
    }
  }

  const header = monthGrid(view.year, view.month, weekStart)[0]!;

  return (
    <div className="flex flex-col gap-3">
      <p id={keysId} className="sr-only">
        {t('keys')}
      </p>
      <div className="flex items-center justify-between gap-3">
        <IconButton label={t('previous')} onClick={() => setView(shiftMonth(view, -1))} disabled={firstMonth <= today.slice(0, 7)}>
          <span aria-hidden="true">←</span>
        </IconButton>
        <p className="text-sm font-bold" aria-live="polite">
          {value?.end ? '' : value ? t('pickEnd') : t('pickStart')}
        </p>
        <IconButton label={t('next')} onClick={() => setView(shiftMonth(view, 1))}>
          <span aria-hidden="true">→</span>
        </IconButton>
      </div>
      <div className={`grid gap-6 ${wide ? 'md:grid-cols-2' : ''}`} onPointerLeave={() => setHover(null)}>
        {months.map((month) => {
          const captionId = `${keysId}-${monthKey(month)}`;
          return (
            <table key={monthKey(month)} role="grid" aria-labelledby={captionId} className="w-full table-fixed border-separate border-spacing-y-1">
              <caption id={captionId} className="pb-2 text-left text-base font-bold capitalize">
                {monthLabel.format(asDate(`${monthKey(month)}-01`))}
              </caption>
              <thead>
                <tr>
                  {header.map(({ date }) => (
                    <th key={date} scope="col" className="pb-1 text-xs font-bold uppercase">
                      <abbr title={weekdayLong.format(asDate(date))} className="no-underline">
                        {weekdayShort.format(asDate(date)).slice(0, 2)}
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
                      const taken = isBlockedDay(blocked, date);
                      const role = dayRole(value, date, hover);
                      const chosen = role === 'start' || role === 'end' || role === 'inside';
                      const label = [
                        dayLabel.format(asDate(date)),
                        taken ? t('taken') : date < today ? t('past') : off ? t('tooFar') : null,
                        role === 'start' ? t('start') : role === 'end' ? t('end') : role === 'inside' ? t('selected') : null,
                      ]
                        .filter(Boolean)
                        .join(', ');
                      // The chosen period is a flat lavender band behind the days (no gradients, DESIGN.md):
                      // full under the days between, half under the start and the end.
                      const band =
                        role === 'inside' || role === 'preview'
                          ? 'inset-x-0'
                          : role === 'start' && value?.end && value.end !== value.start
                            ? 'left-1/2 right-0'
                            : role === 'end' && value?.start !== value?.end
                              ? 'left-0 right-1/2'
                              : null;
                      return (
                        <td key={date} role="gridcell" aria-selected={chosen} className="relative p-0">
                          {band && <span aria-hidden="true" className={`bg-sticker-lavender absolute inset-y-0 ${band}`} />}
                          <button
                            ref={(element) => {
                              if (element) buttons.current.set(date, element);
                              else buttons.current.delete(date);
                            }}
                            type="button"
                            tabIndex={date === focused ? 0 : -1}
                            aria-label={label}
                            aria-pressed={chosen}
                            aria-disabled={off || undefined}
                            aria-describedby={keysId}
                            onClick={() => choose(date)}
                            onPointerEnter={() => setHover(off ? null : date)}
                            onKeyDown={(event) => onKeyDown(event, date)}
                            onFocus={() => setFocused(date)}
                            className={`ease-yoyo relative mx-auto grid aspect-square min-h-10 w-full max-w-11 place-items-center rounded-full border text-sm font-bold tabular-nums transition-[transform,background-color] duration-150 ${
                              taken
                                ? 'text-ink/60 cursor-not-allowed border-transparent line-through decoration-2'
                                : off
                                  ? 'text-ink/45 cursor-default border-transparent'
                                  : role === 'start' || role === 'end'
                                    ? 'bg-cta text-cta-fg border-cta'
                                    : 'border-transparent hover:border-ink hover:-translate-y-0.5 active:scale-[0.92]'
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
    </div>
  );
}
