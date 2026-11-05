'use client';

import { CategoriesResponseSchema, type CategoryNode } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sticker } from '@/components/ui/Sticker';
import { CategoryGrid } from './CategoryGrid';

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Shown when the server could not get the categories in time (the free API host may be waking up):
 * says so plainly and asks the API again from the browser, through the site's own /api proxy.
 */
export function CategoriesRetry({ fetchImpl }: { fetchImpl?: Fetch }) {
  const t = useTranslations('landing.categories');
  const [categories, setCategories] = useState<CategoryNode[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function retry() {
    setLoading(true);
    try {
      const response = await (fetchImpl ?? fetch)('/api/v1/categories', { headers: { accept: 'application/json' } });
      const parsed = response.ok ? CategoriesResponseSchema.safeParse(await response.json()) : null;
      if (parsed?.success) setCategories(parsed.data.categories);
    } catch {
      // Still not there: the message stays and the button can be pressed again.
    } finally {
      setLoading(false);
    }
  }

  if (categories) return <CategoryGrid categories={categories} />;

  return (
    <div role="status" className="border-ink bg-surface rounded-card flex flex-col items-start gap-4 border p-6 sm:flex-row sm:items-center">
      <Sticker kind="bolt" size={48} className="shrink-0 -rotate-6" />
      <p className="max-w-[52ch] flex-1 leading-relaxed">{t('error')}</p>
      <Button variant="ghost" loading={loading} onClick={retry}>
        {t('retry')}
      </Button>
    </div>
  );
}
