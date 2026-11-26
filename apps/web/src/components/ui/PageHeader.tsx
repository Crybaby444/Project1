import type { ReactNode } from 'react';
import { displayFit } from '@/lib/display-fit';

/**
 * The head of every working page, the same everywhere (DESIGN.md "Page"; owner, 2026-11-26: "one style,
 * one grid"): it starts at the page's left edge, at the same height on every page, with the title at the
 * page step of the type scale.
 *
 *   crumbs                                       where the page sits (catalog, item)
 *   [media]  TITLE (count)                       [action]
 *            meta                                 badges and facts of the thing (a deal, a booking)
 *            intro                                one line on what the page is
 *   children                                     what works on the whole page (a search box, chips)
 *
 * The title shrinks only so far that its longest word fits the column (a long Latvian or Russian word on
 * a 320px phone), never above the page step.
 */
export function PageHeader({
  title,
  count,
  intro,
  action,
  crumbs,
  media,
  meta,
  children,
  titleLang,
}: {
  title: string;
  count?: ReactNode;
  intro?: ReactNode;
  action?: ReactNode;
  crumbs?: ReactNode;
  media?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  /** The language of the title when it is people's own text (an item's title). */
  titleLang?: string;
}) {
  return (
    <header className="flex flex-col gap-5">
      {crumbs}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
          {media && <div className="shrink-0">{media}</div>}
          <div className="@container flex min-w-0 flex-1 flex-col gap-3">
            <h1 className="font-display flex flex-wrap items-baseline gap-x-4 gap-y-2 leading-[0.88] font-black uppercase">
              <span
                lang={titleLang}
                style={displayFit(title, { min: '1.75rem', max: 'var(--text-display-l)' })}
                className="text-display-fit min-w-0 [overflow-wrap:anywhere]"
              >
                {title}
              </span>
              {count !== undefined && (
                <span className="border-ink/20 rounded-pill inline-flex min-h-9 -translate-y-1 items-center border px-3 font-sans text-base font-bold tracking-normal normal-case tabular-nums">
                  {count}
                </span>
              )}
            </h1>
            {meta}
            {intro && <p className="text-ink/75 max-w-read text-base leading-relaxed">{intro}</p>}
          </div>
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
      </div>
      {children}
    </header>
  );
}
