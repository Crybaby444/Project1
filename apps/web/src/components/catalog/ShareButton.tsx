'use client';

import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';

/**
 * Shares the page: the device's own share sheet where there is one (phones), otherwise the link is
 * copied and a toast says so. A share the person dismisses is not an error.
 */
export function ShareButton({ title, className = '' }: { title: string; className?: string }) {
  const t = useTranslations('item.share');
  const toast = useToast();

  async function onClick() {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
      } catch {
        // Dismissed, or the sheet is unavailable here: nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show(t('copied'));
    } catch {
      toast.show(t('failed'));
    }
  }

  return (
    <button
      type="button"
      aria-label={t('label')}
      title={t('label')}
      onClick={() => void onClick()}
      className={`border-ink bg-surface text-ink ease-yoyo inline-grid size-11 shrink-0 place-items-center rounded-full border transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.9] ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.75]">
        <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6" />
      </svg>
    </button>
  );
}
