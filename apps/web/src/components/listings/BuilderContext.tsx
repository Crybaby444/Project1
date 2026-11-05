'use client';

import type { CategoryNode } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { findCategory } from '@/lib/listings/categories';
import { checkListing, type BuilderStep, type Check } from '@/lib/listings/listing-checks';
import type { ListingDraft } from '@/lib/listings/use-listing-draft';

export type Builder = {
  draft: ListingDraft;
  categories: CategoryNode[];
  /** The chosen category (a top-level one until a subcategory is picked). */
  category: CategoryNode | undefined;
  /** What review still needs, field by field (checkListing 'submit'). */
  missing: Record<string, Check>;
  /** The text to show under a field, if any (see errorFor in BuilderProvider). */
  errorFor(field: string): string | undefined;
  /** Marks a field as visited (on blur): its draft errors show from then on. */
  touch(field: string): void;
  /** After a submit attempt every missing field shows its error. */
  attempted: boolean;
  setAttempted(value: boolean): void;
  goTo(step: BuilderStep): void;
  readOnly: boolean;
};

const BuilderContext = createContext<Builder | null>(null);

export function useBuilder(): Builder {
  const value = useContext(BuilderContext);
  if (!value) throw new Error('useBuilder must be used inside <BuilderProvider>');
  return value;
}

/** The message of a check, in the page language. */
export function useCheckText(): (check: Check) => string {
  const t = useTranslations('builder.check');
  return useCallback((check: Check) => t(check.key, check.params ?? {}), [t]);
}

/**
 * Shares the draft and its checks with every step. A field shows an error when the API refused it,
 * when it breaks a draft rule (too long, out of range) and the person left it or autosave is holding
 * it back, or, after a submit attempt, when review still needs it.
 */
export function BuilderProvider({
  draft,
  categories,
  goTo,
  children,
}: {
  draft: ListingDraft;
  categories: CategoryNode[];
  goTo(step: BuilderStep): void;
  children: ReactNode;
}) {
  const checkText = useCheckText();
  const tErrors = useTranslations('errors');
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const category = findCategory(categories, draft.values.categoryId);
  const photoCount = draft.listing?.photos.length ?? 0;

  const checks = useMemo(() => {
    const options = { category, photoCount };
    return {
      draft: checkListing(draft.values, 'draft', options),
      submit: checkListing(draft.values, 'submit', options),
    };
  }, [draft.values, category, photoCount]);

  const errorFor = useCallback(
    (field: string) => {
      const server = draft.serverErrors[field] ?? (field === 'lat' ? draft.serverErrors['lng'] : undefined);
      if (server !== undefined) {
        const local = checks.submit[field];
        return local ? checkText(local) : tErrors('fieldInvalid');
      }
      const local = checks.draft[field] ?? (attempted ? checks.submit[field] : undefined);
      if (!local) return undefined;
      // A field autosave is holding back shows why, even if the person has not left it yet.
      return touched.has(field) || attempted || draft.state === 'invalid' ? checkText(local) : undefined;
    },
    [draft.serverErrors, draft.state, checks, attempted, touched, checkText, tErrors],
  );

  const touch = useCallback(
    (field: string) =>
      setTouched((previous) => (previous.has(field) ? previous : new Set(previous).add(field))),
    [],
  );

  const value = useMemo<Builder>(
    () => ({
      draft,
      categories,
      category,
      missing: checks.submit,
      errorFor,
      touch,
      attempted,
      setAttempted,
      goTo,
      readOnly: draft.state === 'readonly' || draft.state === 'conflict',
    }),
    [draft, categories, category, checks.submit, errorFor, touch, attempted, goTo],
  );
  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}
