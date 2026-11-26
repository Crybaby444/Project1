'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { Locale, OwnerListing } from '@yoyo/shared';
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
import { useRouter } from '@/i18n/navigation';
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
import { useSession } from '@/lib/session/SessionProvider';
import { myProfileHref } from '@/lib/profile/links';
import { PageHeader } from '@/components/ui/PageHeader';
import { Sheet } from '@/components/ui/Sheet';

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
        // A draft is still being lent for the first time: "Lend an item", not "Edit listing", even after the
        // first autosave gave it an address of its own (audit 2026-11-26: the title flipped on the first photo).
        isNew={draft.listing === null ? initial === null : draft.listing.status === 'DRAFT'}
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
  const router = useRouter();
  const { user } = useSession();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /** Keep it as a draft and go to My items (the draft is there under Drafts). */
  async function saveAndLeave() {
    setLeaving(true);
    try {
      await draft.flush();
      router.push(user ? myProfileHref(user.id, 'items', 'DRAFT') : '/');
    } finally {
      setLeaving(false);
    }
  }
  const index = BUILDER_STEPS.indexOf(step);
  const previous = BUILDER_STEPS[index - 1];
  const next = BUILDER_STEPS[index + 1];

  return (
    <main className="page page-y stack-page">
      <PageHeader
        title={isNew ? t('titleNew') : t('titleEdit')}
        intro={t('intro')}
        action={
          <>
          <SaveIndicator state={draft.state} />
          {draft.state !== 'readonly' && (draft.listing === null || draft.listing.status === 'DRAFT') && (
            <Button
              variant="ghost"
              onClick={() => void saveAndLeave()}
              loading={leaving}
              disabled={draft.listing === null && draft.state === 'idle'}
            >
              {t('saveDraft')}
            </Button>
          )}
          </>
        }
      >
        {draft.restored && (
          <Sheet as="div" pad="sm" role="status" className="flex items-start gap-3 text-base font-semibold">
            <span aria-hidden="true" className="bg-ink mt-1.5 size-2 flex-none rounded-full" />
            {t('restored')}
          </Sheet>
        )}
        <StatusBanner />
        {draft.state === 'conflict' && <ConflictNotice onReload={draft.reload} />}
        {categoriesFailed !== null && (
          <Sheet as="div" pad="sm" role="alert" className="flex flex-wrap items-center gap-3">
            <p className="font-bold">{errorText(categoriesFailed)}</p>
            <Button variant="ghost" onClick={retryCategories}>
              {t('retry')}
            </Button>
          </Sheet>
        )}
      </PageHeader>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(180px,210px)_minmax(0,1fr)_minmax(300px,380px)] lg:gap-8 xl:grid-cols-[210px_minmax(0,1fr)_420px] xl:gap-10">
        <div className="min-w-0 lg:sticky lg:top-24">
          <StepNav current={step} onSelect={goTo} />
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <div
            key={step}
            style={
              moved ? ({ '--step-from': `${moved.direction * 16}px` } as React.CSSProperties) : undefined
            }
            className={moved ? 'animate-step-in' : undefined}
          >
            <StepSection
              title={t(`steps.${step}`)}
              intro={t(`stepIntro.${step}`)}
              focusOnMount={moved !== null}
              place={{ short: `${index + 1} / ${BUILDER_STEPS.length}`, said: t('steps.number', { number: index + 1, total: BUILDER_STEPS.length }) }}
            >
              {STEP_CONTENT[step]?.()}
            </StepSection>
          </div>

          <div className="border-ink/15 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
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

        <aside className="hidden flex-col gap-3 lg:sticky lg:top-24 lg:flex" aria-label={t('preview.title')}>
          <h2 className="type-label text-ink/70">{t('preview.title')}</h2>
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
  return (
    <ListingPreview
      values={draft.values}
      cover={draft.listing?.photos[0]?.urls ?? null}
      categoryName={path.length > 0 ? path.map((node) => localized(node.names, locale)).join(' · ') : null}
    />
  );
}
