'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useErrorText } from '@/lib/forms/error-text';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** The filters a saved search keeps, as the page has them (prices in whole euros). */
export type SearchToSave = { q?: string; category?: string; priceMax?: number; district?: string };

/**
 * "Tell me about new items": saves the page's search (owner, 2026-11-15), so the bell rings when a
 * matching item is published. A visitor signs in first and comes back here.
 */
export function SaveSearchButton({ query }: { query: SearchToSave }) {
  const t = useTranslations('catalog.saveSearch');
  const errorText = useErrorText();
  const client = useApiClient();
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        client.POST('/api/v1/me/saved-searches', {
          body: {
            ...(query.q && { q: query.q }),
            ...(query.category && { category: query.category }),
            ...(query.priceMax !== undefined && { priceMax: query.priceMax * 100 }),
            ...(query.district && { district: query.district }),
          },
        }),
      ),
  });

  if (!query.q && !query.category && query.priceMax === undefined && !query.district) return null;

  if (save.isSuccess) {
    return (
      <p role="status" className="bg-ink text-canvas rounded-pill inline-flex min-h-10 items-center gap-2 px-4 text-sm font-bold">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        {t('saved')}
      </p>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => {
          if (status !== 'authenticated') {
            const next = `${pathname}${window.location.search}`;
            router.push(`/login?next=${encodeURIComponent(next)}`);
            return;
          }
          save.mutate();
        }}
        className="border-ink rounded-pill ease-yoyo inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />
        </svg>
        {t('save')}
      </button>
      {save.isError && (
        <p role="alert" className="text-sm font-bold">
          {errorText(save.error)}
        </p>
      )}
    </div>
  );
}
