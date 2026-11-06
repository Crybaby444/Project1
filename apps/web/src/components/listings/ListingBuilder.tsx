'use client';

import { displayFit } from '@/lib/display-fit';
import { useQueryClient } from '@tanstack/react-query';
import { STICKER_COLORS, type Locale, type OwnerListing } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useErrorText } from '@/lib/forms/error-text';
import { findPath, localized } from '@/lib/listings/categories';
import { BUILDER_STEPS, type BuilderStep } from '@/lib/listings/listing-checks';
import { useCategories } from '@/lib/listings/queries';
import { useListingDraft } from '@/lib/listings/use-listing-draft';
import { useApiClient } from '@/lib/session/SessionProvider';
import { BuilderProvider, useBuilder } from './BuilderContext';
import { ConflictNotice } from './ConflictNotice';
import { ListingPreview } from './ListingPreview';
import { SaveIndicator } from './SaveIndicator';
import { StepNav } from './StepNav';
import { StepSection } from './StepSection';
import { AttributesStep } from './steps/AttributesStep';
import { BasicsStep } from './steps/BasicsStep';
import { PhotosStep } from './steps/PhotosStep';
import { PlaceStep } from './steps/PlaceStep';
import { PriceStep } from './steps/PriceStep';
import { RulesStep } from './steps/RulesStep';
import { SubmitPanel } from './steps/SubmitPanel';
import { StatusBanner } from './StatusBanner';

/** The fields of each step; steps added by later tasks register here. */
const STEP_CONTENT: Partial<Record<BuilderStep, () => ReactNode>> = {
  photos: () => <PhotosStep />,
  basics: () => <BasicsStep />,
  attributes: () => <AttributesStep />,
  price: () => <PriceStep />,
  place: () => <PlaceStep />,
  rules: () => (
    <div className="flex flex-col gap-8">
      <RulesStep />
      <SubmitPanel />
    </div>
  ),
};

/**
 * Changes the address without a navigation, so the builder keeps its state: `?step=` on a step
 * change, `/listings/:id/edit` once a new listing exists.
 */
function rewriteUrl({ step, pathname }: { step?: BuilderStep; pathname?: string }) {
  const url = new URL(window.location.href);
  if (pathname) url.pathname = pathname;
  if (step) url.searchParams.set('step', step);
  window.history.replaceState(window.history.state, '', url);
}

/**
 * "Lend an item" (spec §4.3): the steps on the left, the open step in the middle and the live card
 * preview on the right (a "Preview" button on phones). Autosaves through useListingDraft; a new
 * listing is created by its first change and the address becomes /listings/:id/edit in place.
 */
export function ListingBuilder({
  initial,
  initialStep,
}: {
  initial: OwnerListing | null;
  initialStep: BuilderStep;
}) {
  const client = useApiClient();
  const pageLocale = useLocale();
  const queryClient = useQueryClient();
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];
  const [step, setStep] = useState<BuilderStep>(initialStep);
  const [moved, setMoved] = useState<{ direction: 1 | -1 } | null>(null);

  const draft = useListingDraft({
    initial,
    client,
    locale: pageLocale as Locale,
    category: (categoryId) => findPath(categories, categoryId).at(-1),
    onCreated: (listing) => {
      void queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] });
      rewriteUrl({
        pathname: window.location.pathname.replace(/\/listings\/new\/?$/, `/listings/${listing.id}/edit`),
      });
    },
  });

  const goTo = useCallback(
    (next: BuilderStep) => {
      void draft.flush();
      setMoved({ direction: BUILDER_STEPS.indexOf(next) >= BUILDER_STEPS.indexOf(step) ? 1 : -1 });
      setStep(next);
      rewriteUrl({ step: next });
    },
    [draft, step],
  );

  return (
    <BuilderProvider draft={draft} categories={categories} goTo={goTo}>
      <BuilderLayout
        step={step}
        moved={moved}
        isNew={initial === null && draft.listing === null}
        categoriesFailed={categoriesQuery.isError ? categoriesQuery.error : null}
        retryCategories={() => void categoriesQuery.refetch()}
      />
    </BuilderProvider>
  );
}

function BuilderLayout({
  step,
  moved,
  isNew,
  categoriesFailed,
  retryCategories,
}: {
  step: BuilderStep;
  moved: { direction: 1 | -1 } | null;
  isNew: boolean;
  categoriesFailed: unknown;
  retryCategories(): void;
}) {
  const t = useTranslations('builder');
  const errorText = useErrorText();
  const { draft, goTo } = useBuilder();
  const [previewOpen, setPreviewOpen] = useState(false);
  const index = BUILDER_STEPS.indexOf(step);
  const previous = BUILDER_STEPS[index - 1];
  const next = BUILDER_STEPS[index + 1];

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="@container flex min-w-0 flex-1 flex-col gap-2">
          <h1
            style={displayFit(isNew ? t('titleNew') : t('titleEdit'), { max: '3.5rem' })}
            className="font-display text-display-fit leading-[0.85] font-black uppercase"
          >
            {isNew ? t('titleNew') : t('titleEdit')}
          </h1>
          <p className="leading-relaxed">{t('intro')}</p>
        </div>
        <SaveIndicator state={draft.state} />
      </header>

      <StatusBanner />
      {draft.state === 'conflict' && <ConflictNotice onReload={draft.reload} />}
      {categoriesFailed !== null && (
        <div
          role="alert"
          className="border-ink bg-surface rounded-card flex flex-wrap items-center gap-3 border p-4"
        >
          <p className="font-bold">{errorText(categoriesFailed)}</p>
          <Button variant="ghost" onClick={retryCategories}>
            {t('retry')}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)_minmax(280px,340px)] lg:gap-8">
        <div className="min-w-0 lg:sticky lg:top-6">
          <StepNav current={step} onSelect={goTo} />
        </div>

        <div className="border-ink bg-surface rounded-card-xl flex min-w-0 flex-col gap-8 border p-5 sm:p-8">
          <div
            key={step}
            style={
              moved ? ({ '--step-from': `${moved.direction * 16}px` } as React.CSSProperties) : undefined
            }
            className={moved ? 'animate-step-in' : undefined}
          >
            <p className="mb-2 text-[13px] font-bold tracking-[0.03em] uppercase">
              {t('steps.number', { number: index + 1, total: BUILDER_STEPS.length })}
            </p>
            <StepSection
              title={t(`steps.${step}`)}
              intro={t(`stepIntro.${step}`)}
              focusOnMount={moved !== null}
            >
              {STEP_CONTENT[step]?.()}
            </StepSection>
          </div>

          <div className="border-ink/20 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            {previous ? (
              <Button variant="ghost" onClick={() => goTo(previous)}>
                <span aria-hidden="true">←</span> {t('back')}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" className="lg:hidden" onClick={() => setPreviewOpen(true)}>
                {t('preview.open')}
              </Button>
              {next && (
                <Button onClick={() => goTo(next)}>
                  {t('next')} <span aria-hidden="true">→</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden flex-col gap-3 lg:sticky lg:top-6 lg:flex" aria-label={t('preview.title')}>
          <h2 className="text-[13px] font-bold tracking-[0.03em] uppercase">{t('preview.title')}</h2>
          <BuilderPreview />
          <p className="text-sm">{t('preview.privacy')}</p>
        </aside>
      </div>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title={t('preview.title')}>
        <div className="flex flex-col gap-4">
          <BuilderPreview />
          <p className="text-sm">{t('preview.privacy')}</p>
          <Button variant="ghost" onClick={() => setPreviewOpen(false)} className="self-end">
            {t('preview.close')}
          </Button>
        </div>
      </Dialog>
    </main>
  );
}

function BuilderPreview() {
  const locale = useLocale();
  const { draft, categories } = useBuilder();
  const path = findPath(categories, draft.values.categoryId);
  const leaf = path.at(-1);
  return (
    <ListingPreview
      values={draft.values}
      cover={draft.listing?.photos[0]?.urls ?? null}
      categoryName={path.length > 0 ? path.map((node) => localized(node.names, locale)).join(' · ') : null}
      categoryColor={leaf ? STICKER_COLORS[leaf.sticker] : undefined}
    />
  );
}
