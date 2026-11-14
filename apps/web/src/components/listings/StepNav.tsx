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
      <ol className="border-ink/15 m-0 flex snap-x scroll-px-4 list-none gap-5 overflow-x-auto border-b px-4 p-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-b-0 lg:px-0">
        {BUILDER_STEPS.map((step, index) => {
          const isCurrent = step === current;
          // Details are only done once there is a subcategory whose details they are.
          const done =
            started &&
            step !== 'rules' &&
            !missingSteps.has(step) &&
            (step !== 'attributes' || (category !== undefined && isLeaf(category)));
          return (
            <li key={step} className="lg:border-ink/15 shrink-0 snap-start lg:border-b">
              <a
                ref={isCurrent ? active : undefined}
                href={`?step=${step}`}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(step);
                }}
                className={`group relative flex min-h-11 items-center gap-2.5 py-3 whitespace-nowrap transition-colors duration-300 lg:grid lg:grid-cols-[2.2em_1fr_18px] lg:py-3.5 ${
                  isCurrent
                    ? 'text-ink after:bg-ink after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] lg:after:hidden'
                    : 'text-ink/65 hover:text-ink'
                }`}
              >
                <span aria-hidden="true" className="self-start pt-[0.35em] text-xs font-bold tabular-nums lg:self-center lg:pt-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-[1.45rem] leading-none font-black uppercase transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] lg:text-[1.7rem] lg:group-hover:translate-x-1.5">
                  {t(step)}
                </span>
                {isCurrent ? (
                  <span aria-hidden="true" className="bg-ink hidden size-2.5 justify-self-end rounded-full lg:block" />
                ) : done ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 justify-self-end">
                    <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
                {done && <span className="sr-only">, {t('done')}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
