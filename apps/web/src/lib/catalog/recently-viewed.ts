import { CatalogItemSchema, type CatalogItem } from '@yoyo/shared';

/** Browser storage key: a per-viewer convenience only, never sent anywhere. */
const KEY = 'yoyo-recent';
export const RECENT_LIMIT = 8;
/** Fired on this tab when the list changes, so a strip on the page can follow. */
export const RECENT_EVENT = 'yoyo-recent-change';

/** The items this browser looked at, newest first; anything unreadable is skipped. */
export function recallViewed(): CatalogItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((entry) => {
      // Items stored before countries (2026-11-16) have none: read them as unknown, not broken.
      // Items remembered before a field existed get its default (country 2026-11-16, demo 2026-11-16).
      const filled = entry && typeof entry === 'object' ? { country: null, demo: false, ...entry } : entry;
      const parsed = CatalogItemSchema.safeParse(filled);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export function rememberViewed(item: CatalogItem): void {
  try {
    const next = [item, ...recallViewed().filter((i) => i.id !== item.id)].slice(0, RECENT_LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    // Private mode or storage refused: the strip just stays empty.
  }
}

export function forgetViewed(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    // Nothing to forget.
  }
}

/**
 * After the API said which of them are still visible (and how they look now): keep only those, in the
 * remembered order. Removed items leave the strip for good (2026-11-19).
 */
export function refreshViewed(fresh: CatalogItem[]): CatalogItem[] {
  const byId = new Map(fresh.map((item) => [item.id, item]));
  const next = recallViewed().flatMap((item) => {
    const now = byId.get(item.id);
    return now ? [now] : [];
  });
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage refused: the strip still shows the fresh list this time.
  }
  return next;
}
