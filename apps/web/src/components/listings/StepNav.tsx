'use client';

import { useTranslations } from 'next-intl';
import { isLeaf } from '@/lib/listings/categories';
import { BUILDER_STEPS, stepOf, type BuilderStep } from '@/lib/listings/listing-checks';
import { useBuilder } from './BuilderContext';

/**
 * The steps as links (`?step=…`) with `aria-current="step"` on the open one. A step whose fields
 * review needs no more gets a check mark ("done" for screen readers). On a phone the steps are a row of
 * six numbered dots joined by a line that fits the screen (the step's name is the section's heading
 * right below); from lg up, the named list in the side column.
 */
export function StepNav({ current, onSelect }: { current: BuilderStep; onSelect(step: BuilderStep): void }) {
  const t = useTranslations('builder.steps');
  const { missing, draft, category } = useBuilder();
  const missingSteps = new Set(Object.keys(missing).map(stepOf));
  const started = draft.listing !== null;

  // Details are only done once there is a subcategory whose details they are.
  const isDone = (step: BuilderStep) =>
    started && step !== 'rules' && !missingSteps.has(step) && (step !== 'attributes' || (category !== undefined && isLeaf(category)));

  return (
    <nav aria-label={t('label')} className="min-w-0">
      <ol className="lg:border-ink/15 m-0 grid list-none grid-cols-6 p-0 lg:flex lg:flex-col lg:border-t">
        {BUILDER_STEPS.map((step, index) => {
          const isCurrent = step === current;
          const done = isDone(step);
          return (
            <li
              key={step}
              className="max-lg:before:bg-ink/20 lg:border-ink/15 relative flex justify-center max-lg:before:absolute max-lg:before:top-1/2 max-lg:before:right-1/2 max-lg:before:left-[-50%] max-lg:before:h-px max-lg:first:before:hidden lg:block lg:border-b"
            >
              <a
                href={`?step=${step}`}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(step);
                }}
                className={`group relative transition-colors duration-300 max-lg:grid max-lg:size-10 max-lg:place-items-center max-lg:rounded-full max-lg:border lg:grid lg:min-h-11 lg:grid-cols-[2.2em_1fr_18px] lg:items-center lg:gap-2.5 lg:py-3.5 ${
                  isCurrent
                    ? 'text-ink max-lg:bg-ink max-lg:text-canvas max-lg:border-ink'
                    : done
                      ? 'text-ink max-lg:bg-surface max-lg:border-ink lg:text-ink/65 lg:hover:text-ink'
                      : 'text-ink/65 hover:text-ink max-lg:bg-canvas max-lg:border-ink/25'
                }`}
              >
                <span aria-hidden="true" className="text-xs font-bold tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {/* Read out on a phone (the dots carry no names); the display face only where it shows, from lg up. */}
                <span className="max-lg:sr-only lg:font-display transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] lg:text-3xl lg:leading-none lg:font-black lg:uppercase lg:group-hover:translate-x-1.5">
                  {t(step)}
                </span>
                {isCurrent ? (
                  <span aria-hidden="true" className="bg-ink hidden size-2.5 justify-self-end rounded-full lg:block" />
                ) : done ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="max-lg:bg-ink max-lg:text-canvas max-lg:ring-canvas size-4 justify-self-end max-lg:absolute max-lg:-top-1 max-lg:-right-1 max-lg:size-4 max-lg:rounded-full max-lg:p-0.5 max-lg:ring-2"
                  >
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
