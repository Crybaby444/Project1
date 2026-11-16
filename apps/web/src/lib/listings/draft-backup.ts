import type { ListingValues } from './listing-checks';

/**
 * A copy of the builder's unsent changes in this browser (owner, 2026-11-16: a draft must survive a
 * crash, a closed tab or a lost connection). Written on every change, cleared once the API has them;
 * read when the builder opens. Keyed by the listing's id, or `new` before the draft exists.
 */
export type DraftBackup = { values: Partial<ListingValues>; at: number };

const key = (id: string | null) => `yoyo:draft:${id ?? 'new'}`;
/** Older copies are dropped: a week is long enough to come back to a half-typed listing. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function writeBackup(id: string | null, values: Partial<ListingValues>): void {
  try {
    if (Object.keys(values).length === 0) window.localStorage.removeItem(key(id));
    else
      window.localStorage.setItem(key(id), JSON.stringify({ values, at: Date.now() } satisfies DraftBackup));
  } catch {
    // private mode or full storage: autosave still works, only the crash copy is missing
  }
}

export function readBackup(id: string | null, now = Date.now()): Partial<ListingValues> | null {
  try {
    const raw = window.localStorage.getItem(key(id));
    if (!raw) return null;
    const copy = JSON.parse(raw) as DraftBackup;
    if (!copy?.values || now - copy.at > MAX_AGE_MS) {
      window.localStorage.removeItem(key(id));
      return null;
    }
    return Object.keys(copy.values).length > 0 ? copy.values : null;
  } catch {
    return null;
  }
}

export function clearBackup(id: string | null): void {
  try {
    window.localStorage.removeItem(key(id));
  } catch {
    // nothing to clear
  }
}
