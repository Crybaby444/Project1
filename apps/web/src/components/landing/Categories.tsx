import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { loadCategories, type CategoriesResult } from '@/lib/categories';
import { CategoriesRetry } from './CategoriesRetry';
import { CategoryGrid } from './CategoryGrid';
import { Section, SectionTitle } from './Section';

/** The list itself: real categories from the API, or the retry card when it did not answer in time. */
export async function CategoryList({ load = loadCategories }: { load?: () => Promise<CategoriesResult> }) {
  const result = await load();
  if (!result.ok) return <CategoriesRetry />;
  return <CategoryGrid categories={result.categories} />;
}

/** Same footprint as two rows of cards, so the page does not jump when the list streams in. */
function CategoriesLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className="grid min-h-[30rem] gap-4 sm:grid-cols-2 lg:min-h-[19rem] lg:grid-cols-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} aria-hidden="true" className="border-ink bg-mist rounded-card hidden h-36 border sm:block" />
      ))}
    </div>
  );
}

export async function Categories() {
  const t = await getTranslations('landing.categories');

  return (
    <Section id="categories" tone="surface">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <SectionTitle
          id="categories"
          eyebrow={t('eyebrow')}
          title={t('title')}
          stickers={[{ kind: 'tag', size: 96, top: '-12%', right: '0%', rotate: -14 }]}
        />
        <p className="max-w-[46ch] text-lg leading-relaxed">{t('lead')}</p>
      </div>
      <div className="mt-12">
        <Suspense fallback={<CategoriesLoading label={t('loading')} />}>
          <CategoryList />
        </Suspense>
      </div>
    </Section>
  );
}
