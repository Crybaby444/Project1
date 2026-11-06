'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { isLeaf } from '@/lib/listings/categories';
import { BUILDER_STEPS, stepOf, type BuilderStep } from '@/lib/listings/listing-checks';
import { useBuilder } from './BuilderContext';

/**
 * The steps as links (`?step=…`) with `aria-current="step"` on the open one. A step whose fields
 * review needs no more gets a check mark ("done" for screen readers). On a phone the row scrolls.
 */
export function StepNav({ current, onSelect }: { current: BuilderStep; onSelect(step: BuilderStep): void }) {
  const t = useTranslations('builder.steps');
  const { missing, draft, category } = useBuilder();
  const active = useRef<HTMLAnchorElement>(null);
  const missingSteps = new Set(Object.keys(missing).map(stepOf));
  const started = draft.listing !== null;

  useEffect(() => {
    active.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  return (
    <nav aria-label={t('label')} className="-mx-4 min-w-0 lg:mx-0">
      <ol className="flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:flex-col lg:overflow-visible lg:px-0">
        {BUILDER_STEPS.map((step, index) => {
          const isCurrent = step === current;
          // Details are only done once there is a subcategory whose details they are.
          const done =
            started &&
            step !== 'rules' &&
            !missingSteps.has(step) &&
            (step !== 'attributes' || (category !== undefined && isLeaf(category)));
          return (
            <li key={step} className="shrink-0 snap-start">
              <a
                ref={isCurrent ? active : undefined}
                href={`?step=${step}`}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(step);
                }}
                className={`rounded-pill ease-yoyo group relative flex min-h-11 items-center gap-2.5 border py-1.5 pr-4 pl-1.5 text-sm font-bold whitespace-nowrap transition-[transform,background-color,color] duration-250 hover:-translate-y-0.5 active:scale-[0.96] lg:hover:translate-x-1 lg:hover:translate-y-0 ${
                  isCurrent ? 'border-cta bg-cta text-cta-fg' : 'border-ink bg-surface text-ink hover:bg-mist'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-8 shrink-0 place-items-center rounded-full border text-[13px] tabular-nums ${
                    done
                      ? 'bg-sticker-blue border-black text-black'
                      : isCurrent
                        ? 'border-cta-fg'
                        : 'border-ink'
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" className="size-4">
                      <path
                        d="m5 12.5 4.5 4.5L19 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                {t(step)}
                {done && <span className="sr-only">, {t('done')}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
