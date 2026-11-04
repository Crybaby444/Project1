'use client';

import type { ApiClient } from '@yoyo/api-client';
import type { CategoryNode, OwnerListing } from '@yoyo/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { checkListing, emptyValues, valuesFromListing, type ListingValues } from './listing-checks';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'invalid' | 'conflict' | 'readonly';

type Field = keyof ListingValues;

/** Autosave waits this long after the last change. */
export const AUTOSAVE_DELAY_MS = 700;

/** `attributes.model` → `attributes`, `rules.custom.0` → `rules`, `lng` → `lat` (sent together). */
function fieldOf(errorKey: string): Field {
  const top = errorKey.split('.')[0]!;
  return (top === 'lng' ? 'lat' : top) as Field;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function bodyOf(values: ListingValues, fields: Field[]): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    if (field === 'lat') {
      body['lat'] = values.lat;
      body['lng'] = values.lng;
    } else if (field !== 'lng') body[field] = values[field];
  }
  return body;
}

type Options = {
  initial: OwnerListing | null;
  client: ApiClient;
  /** The category of an id (its attributes are checked before sending). */
  category: (categoryId: string | null) => CategoryNode | undefined;
  /** Called once when the first change has created the draft. */
  onCreated?: (listing: OwnerListing) => void;
  /** Tests shorten it. */
  delayMs?: number;
};

export type ListingDraft = {
  listing: OwnerListing | null;
  values: ListingValues;
  state: SaveState;
  /** Field errors the API returned for the last save (`fields` of a 400). */
  serverErrors: Record<string, string>;
  change(patch: Partial<ListingValues>): void;
  /** Sends what is waiting now (before a step change, a submit, leaving the page). */
  flush(): Promise<void>;
  /**
   * Runs a change of its own (photos, dates) in the same queue as autosave, so versions never race:
   * creates the draft first if there is none, then applies what `task` returns to the listing.
   */
  withListing(
    task: (listing: OwnerListing) => Promise<(listing: OwnerListing) => OwnerListing>,
  ): Promise<void>;
  /** Updates the listing shown, e.g. after a submit or hide (the API's answer). */
  replace(listing: OwnerListing): void;
  /** Throws away local changes and loads the listing as stored (after a conflict). */
  reload(): Promise<void>;
};

/**
 * The listing builder's draft: local values, autosaved with `PATCH /listings/:id` and the version
 * last seen, at most one request at a time. A stale version (409) stops autosave with `conflict`
 * rather than overwrite another tab's changes; a field that would be refused (checkListing 'draft')
 * waits until it is fixed. Without a listing, the first change creates one (`POST /listings`).
 */
export function useListingDraft({
  initial,
  client,
  category,
  onCreated,
  delayMs = AUTOSAVE_DELAY_MS,
}: Options): ListingDraft {
  const [listing, setListing] = useState<OwnerListing | null>(initial);
  const [values, setValues] = useState<ListingValues>(() =>
    initial ? valuesFromListing(initial) : emptyValues(),
  );
  const [state, setState] = useState<SaveState>(initial?.status === 'ARCHIVED' ? 'readonly' : 'idle');
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const live = useRef({
    values,
    listing,
    dirty: new Set<Field>(),
    queue: Promise.resolve() as Promise<unknown>,
    saveQueued: null as Promise<void> | null,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    retries: 0,
    stopped: initial?.status === 'ARCHIVED',
  });
  const callbacks = useRef({ category, onCreated });
  /** The latest `save`, for the retry timer that runSave sets (save itself is declared after it). */
  const saveRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    callbacks.current = { category, onCreated };
  });

  const showListing = useCallback((next: OwnerListing) => {
    live.current.listing = next;
    setListing(next);
  }, []);

  const enqueue = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const run = live.current.queue.then(task);
    live.current.queue = run.catch(() => undefined);
    return run;
  }, []);

  const runSave = useCallback(
    async ({ create = false } = {}) => {
      const ref = live.current;
      if (ref.stopped) return;
      const sent = ref.values;
      const refused = new Set(
        Object.keys(
          checkListing(sent, 'draft', {
            category: callbacks.current.category(sent.categoryId),
            photoCount: 0,
          }),
        ).map(fieldOf),
      );
      const fields = [...ref.dirty].filter((field) => !refused.has(field));
      const current = ref.listing;
      if (fields.length === 0 && !(create && current === null)) {
        setState(ref.dirty.size > 0 ? 'invalid' : (previous) => (previous === 'saving' ? 'saved' : previous));
        return;
      }
      setState('saving');
      try {
        const body = bodyOf(sent, fields);
        const saved = current
          ? (
              await unwrap(
                client.PATCH('/api/v1/listings/{id}', {
                  params: { path: { id: current.id } },
                  body: { ...body, version: current.version } as never,
                }),
              )
            ).listing
          : (await unwrap(client.POST('/api/v1/listings', { body: body as never }))).listing;
        // What changed since sending stays dirty; the rest now shows what the API stored (cleaned text).
        const stored = valuesFromListing(saved);
        let next = ref.values;
        for (const field of fields) {
          if (!same(ref.values[field], sent[field])) continue;
          ref.dirty.delete(field);
          next =
            field === 'lat'
              ? { ...next, lat: stored.lat, lng: stored.lng }
              : { ...next, [field]: stored[field] };
        }
        ref.values = next;
        setValues(next);
        showListing(saved);
        ref.retries = 0;
        setServerErrors({});
        setState(ref.dirty.size > 0 ? 'invalid' : 'saved');
        if (!current) callbacks.current.onCreated?.(saved);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          ref.stopped = true;
          clearTimeout(ref.timer);
          setState('conflict');
        } else if (error instanceof ApiError && error.status === 400) {
          setServerErrors(error.fields ?? {});
          setState('invalid');
        } else {
          setState('error');
          ref.retries += 1;
          clearTimeout(ref.timer);
          ref.timer = setTimeout(
            () => void saveRef.current(),
            Math.min(3000 * 2 ** (ref.retries - 1), 30_000),
          );
        }
        if (create) throw error;
      }
    },
    [client, showListing],
  );

  const save = useCallback((): Promise<void> => {
    const ref = live.current;
    if (ref.saveQueued) return ref.saveQueued;
    const queued = enqueue(async () => {
      ref.saveQueued = null;
      await runSave();
    });
    ref.saveQueued = queued;
    return queued;
  }, [enqueue, runSave]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const change = useCallback(
    (patch: Partial<ListingValues>) => {
      const ref = live.current;
      if (ref.stopped) return;
      ref.values = { ...ref.values, ...patch };
      setValues(ref.values);
      const touched = Object.keys(patch).map((key) => fieldOf(key));
      touched.forEach((field) => ref.dirty.add(field));
      setServerErrors((errors) => {
        const left = Object.entries(errors).filter(([key]) => !touched.includes(fieldOf(key)));
        return left.length === Object.keys(errors).length ? errors : Object.fromEntries(left);
      });
      clearTimeout(ref.timer);
      ref.timer = setTimeout(() => void save(), delayMs);
    },
    [delayMs, save],
  );

  const flush = useCallback(async () => {
    clearTimeout(live.current.timer);
    if (live.current.dirty.size > 0) await save();
    await live.current.queue;
  }, [save]);

  const withListing = useCallback<ListingDraft['withListing']>(
    (task) =>
      enqueue(async () => {
        const ref = live.current;
        if (!ref.listing) await runSave({ create: true });
        const target = ref.listing;
        if (!target) throw ApiError.network();
        const update = await task(target);
        if (ref.listing) showListing(update(ref.listing));
      }),
    [enqueue, runSave, showListing],
  );

  const replace = useCallback((next: OwnerListing) => showListing(next), [showListing]);

  const reload = useCallback(async () => {
    const current = live.current.listing;
    if (!current) return;
    const fresh = (
      await unwrap(client.GET('/api/v1/listings/{id}', { params: { path: { id: current.id } } }))
    ).listing;
    const ref = live.current;
    clearTimeout(ref.timer);
    ref.dirty.clear();
    ref.values = valuesFromListing(fresh);
    ref.stopped = fresh.status === 'ARCHIVED';
    setValues(ref.values);
    showListing(fresh);
    setServerErrors({});
    setState(ref.stopped ? 'readonly' : 'idle');
  }, [client, showListing]);

  // Leaving with changes not yet sent: send them when the tab is hidden, warn on closing.
  useEffect(() => {
    const ref = live.current;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && ref.dirty.size > 0) void flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (ref.dirty.size > 0 && !ref.stopped) event.preventDefault();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearTimeout(ref.timer);
    };
  }, [flush]);

  return useMemo(
    () => ({ listing, values, state, serverErrors, change, flush, withListing, replace, reload }),
    [listing, values, state, serverErrors, change, flush, withListing, replace, reload],
  );
}
