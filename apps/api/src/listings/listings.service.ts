import { isDeepStrictEqual } from 'node:util';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { compareDates, diffDays, DomainError, localDate, localDateIn, period, type LocalDate, type Period } from '@yoyo/domain';
import {
  validateAttributes,
  type DatePeriod,
  type ListingDraft,
  type ListingPatch,
  type ListingRules,
  type ListingStatus,
  type OwnerListing,
  type OwnerListingSummary,
  type PublicUser,
} from '@yoyo/shared';
import { CategoriesService, type CategoryForListing } from '../categories/categories.service';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Listing, Prisma } from '../generated/prisma/client';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { PrismaService } from '../prisma/prisma.service';
import { incomplete, incompleteFields } from './listing-completeness';
import { nextStatus, type EditKind } from './listing-status';
import { serializeListing, serializePeriods, serializeSummary, type ListingWithRelations, type UrlFor } from './listing.serializer';

/**
 * Fields whose change sends a live listing back to review: what moderation checked, and every text the
 * owner writes that the public reads (city and district are shown on the card). Every other field is
 * a term. Own rules are free text too, so `rules` counts as content when its `custom` part changes.
 */
const CONTENT_FIELDS: ReadonlySet<string> = new Set(['title', 'description', 'categoryId', 'attributes', 'condition', 'city', 'district']);

/** Whether changing `key` of `listing` to `value` is a change of content (see CONTENT_FIELDS). */
function isContentChange(listing: Listing, key: keyof ListingDraft, value: unknown): boolean {
  if (CONTENT_FIELDS.has(key)) return true;
  if (key === 'rules') return !isDeepStrictEqual((value as ListingRules).custom, (listing.rules as ListingRules | null)?.custom ?? []);
  return false;
}

const WITH_RELATIONS = { photos: true, unavailability: true } as const;

type DraftData = Omit<Prisma.ListingUncheckedUpdateInput, 'id' | 'ownerId' | 'status' | 'version'>;

/** Statuses in which a listing has been (or is being) checked by moderation, so it must stay complete. */
export const mustStayComplete = (status: ListingStatus) => status === 'PENDING_REVIEW' || status === 'PUBLISHED' || status === 'HIDDEN';

/**
 * Checks every period with the core and returns them sorted, overlapping or touching ones merged
 * (`[1–5]` and `[4–8]` → `[1–8]`; `[1–5]` and `[6–8]` too), those that ended before `today` dropped.
 * Errors are keyed `periods.<i>.start|end`.
 */
export function mergePeriods(input: DatePeriod[], today: LocalDate): DatePeriod[] {
  const fields: Record<string, string> = {};
  const checked: Period[] = [];
  for (const [i, raw] of input.entries()) {
    let start: LocalDate | undefined;
    let end: LocalDate | undefined;
    try {
      start = localDate(raw.start);
    } catch {
      fields[`periods.${i}.start`] = 'No such day';
    }
    try {
      end = localDate(raw.end);
    } catch {
      fields[`periods.${i}.end`] = 'No such day';
    }
    if (start === undefined || end === undefined) continue;
    try {
      checked.push(period(start, end));
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      fields[`periods.${i}.end`] = 'Ends before it starts';
    }
  }
  if (Object.keys(fields).length > 0) throw new AppError('VALIDATION_FAILED', 400, undefined, fields);

  const merged: Period[] = [];
  for (const p of checked.filter((p) => compareDates(p.end, today) >= 0).sort((a, b) => compareDates(a.start, b.start))) {
    const last = merged.at(-1);
    // diffDays, not addDays: `last.end + 1` would not exist after 9999-12-31.
    if (last && diffDays(last.end, p.start) <= 1) {
      merged[merged.length - 1] = period(last.start, compareDates(p.end, last.end) > 0 ? p.end : last.end);
    } else merged.push(p);
  }
  return merged.map((p) => ({ start: p.start, end: p.end }));
}

const notFound = () => new AppError('NOT_FOUND', 404, 'Listing not found');

export const invalidStatus = (status: ListingStatus) =>
  new AppError('INVALID_STATUS', 409, `Not possible while the listing is ${status}`);

/** What the listing currently holds for a draft field, in the same form the draft gives it. */
function currentValue(listing: Listing, key: keyof ListingDraft): unknown {
  if (key === 'lat' || key === 'lng') return listing[key]?.toNumber() ?? null;
  return listing[key];
}

@Injectable()
export class ListingsService {
  private readonly logger = new Logger('Listings');

  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** Where each photo size is served. */
  readonly urlFor: UrlFor = (key, variant) => this.storage.url(key, variant);

  async create(ownerId: string, draft: ListingDraft): Promise<OwnerListing> {
    const { data } = await this.draftData(null, draft);
    const listing = await this.prisma.listing.create({
      data: { ...(data as Prisma.ListingUncheckedCreateInput), ownerId, status: 'DRAFT' },
      include: WITH_RELATIONS,
    });
    return serializeListing(listing, 'owner', this.urlFor);
  }

  async listMine(ownerId: string, status?: ListingStatus): Promise<OwnerListingSummary[]> {
    const rows = await this.prisma.listing.findMany({
      where: { ownerId, status: status ?? { not: 'ARCHIVED' } },
      include: { photos: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => serializeSummary(row, this.urlFor));
  }

  /** The owner's or (for an administrator) anyone's listing; to everyone else it does not exist. */
  async view(id: string, viewer: PublicUser): Promise<OwnerListing> {
    const listing = await this.prisma.listing.findUnique({ where: { id }, include: WITH_RELATIONS });
    if (!listing || (listing.ownerId !== viewer.id && viewer.role !== 'ADMIN')) throw notFound();
    return serializeListing(listing, listing.ownerId === viewer.id ? 'owner' : 'admin', this.urlFor);
  }

  /** The caller's own listing with its photos and dates, or 404 (someone else's listing does not exist). */
  async owned(id: string, ownerId: string): Promise<ListingWithRelations> {
    const listing = await this.prisma.listing.findUnique({ where: { id }, include: WITH_RELATIONS });
    if (!listing || listing.ownerId !== ownerId) throw notFound();
    return listing;
  }

  async serialize(id: string): Promise<OwnerListing> {
    const listing = await this.prisma.listing.findUniqueOrThrow({ where: { id }, include: WITH_RELATIONS });
    return serializeListing(listing, 'owner', this.urlFor);
  }

  /**
   * Applies a partial change. The client's `version` must be the current one, so two tabs never
   * overwrite each other: a stale one gets 409 INVALID_STATUS with `details.currentVersion`. A change
   * of content sends a published or hidden listing back to review; a change of terms does not.
   * Values equal to the current ones are no change at all.
   */
  async update(id: string, ownerId: string, patch: ListingPatch): Promise<OwnerListing> {
    const { version, ...draft } = patch;
    const listing = await this.owned(id, ownerId);
    if (listing.status === 'ARCHIVED') throw invalidStatus(listing.status);
    if (version !== listing.version) throw this.stale(listing.version);

    const { data, category } = await this.draftData(listing, draft);
    const changed = (Object.keys(data) as (keyof ListingDraft)[]).filter(
      (key) => !isDeepStrictEqual(data[key as keyof DraftData], currentValue(listing, key)),
    );
    if (changed.length === 0) return serializeListing(listing, 'owner', this.urlFor);
    const kind: EditKind = changed.some((key) => isContentChange(listing, key, data[key as keyof DraftData])) ? 'content' : 'terms';
    const changes = Object.fromEntries(changed.map((key) => [key, data[key as keyof DraftData]])) as DraftData;
    if (mustStayComplete(listing.status)) {
      // Only problems this change brings are refused: if the catalog changed under a live listing
      // (an attribute retired, say), its owner can still change the price, place or rules.
      const before = incompleteFields(listing, listing.photos.length, await this.categoryOf(listing, category));
      const after = incompleteFields({ ...listing, ...changes } as Listing, listing.photos.length, category);
      const added = Object.fromEntries(Object.entries(after).filter(([field, message]) => before[field] !== message));
      if (Object.keys(added).length > 0) throw incomplete(added);
    }
    await this.write(listing, changes, kind);
    return this.serialize(id);
  }

  /** The listing's current category, reusing `known` when it is that one. */
  private async categoryOf(listing: Listing, known: CategoryForListing | null): Promise<CategoryForListing | null> {
    if (listing.categoryId === null) return null;
    return known?.id === listing.categoryId ? known : this.categories.forListing(listing.categoryId);
  }

  /** 400 LISTING_INCOMPLETE unless the listing has everything review needs. */
  async assertComplete(listing: Listing, photoCount: number): Promise<void> {
    const category = listing.categoryId === null ? null : await this.categories.forListing(listing.categoryId);
    const fields = incompleteFields(listing, photoCount, category);
    if (Object.keys(fields).length > 0) throw incomplete(fields);
  }

  /** A complete draft or rejected listing goes to review; the old rejection reason is cleared. */
  async submit(id: string, ownerId: string): Promise<OwnerListing> {
    const listing = await this.owned(id, ownerId);
    const status = nextStatus(listing.status, 'submit');
    if (status === null || status === 'REMOVED') throw invalidStatus(listing.status);
    await this.assertComplete(listing, listing.photos.length);
    await this.transition(listing, status, { submittedAt: this.clock.now(), rejectionReason: null });
    return this.serialize(id);
  }

  /** The owner takes a published listing out of the catalog (`hide`) or puts it back (`unhide`). */
  async setVisibility(id: string, ownerId: string, action: 'hide' | 'unhide'): Promise<OwnerListing> {
    const listing = await this.owned(id, ownerId);
    const status = nextStatus(listing.status, action);
    if (status === null || status === 'REMOVED') throw invalidStatus(listing.status);
    await this.transition(listing, status, {});
    return this.serialize(id);
  }

  /**
   * Replaces the unavailable days. Each period is checked by the core (`period`: real days, end not
   * before start); overlapping or touching periods are merged and those wholly in the past (in the
   * listing's time zone) dropped. Dates are terms: a live listing stays live.
   */
  async setUnavailability(
    id: string,
    ownerId: string,
    input: DatePeriod[],
    version?: number,
  ): Promise<{ periods: DatePeriod[]; version: number }> {
    const listing = await this.owned(id, ownerId);
    if (listing.status === 'ARCHIVED') throw invalidStatus(listing.status);
    if (version !== undefined && version !== listing.version) throw this.stale(listing.version);
    const periods = mergePeriods(input, localDateIn(this.clock.now(), listing.timeZone));
    // The same dates again (an autosave) change nothing: no new version, no new place in the queue.
    if (isDeepStrictEqual(periods, serializePeriods(listing.unavailability))) return { periods, version: listing.version };
    await this.prisma.$transaction(async (tx) => {
      await tx.unavailability.deleteMany({ where: { listingId: id } });
      await tx.unavailability.createMany({
        data: periods.map((p) => ({ listingId: id, start: new Date(`${p.start}T00:00:00Z`), end: new Date(`${p.end}T00:00:00Z`) })),
      });
      await this.write(listing, {}, 'terms', tx);
    });
    const fresh = await this.owned(id, ownerId);
    return { periods: serializePeriods(fresh.unavailability), version: fresh.version };
  }

  /** Moves the listing to `status` (with `data`), counting the version up; 409 if it changed in between. */
  async transition(
    listing: Listing,
    status: ListingStatus,
    data: Prisma.ListingUncheckedUpdateManyInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const updated = await tx.listing.updateMany({
      where: { id: listing.id, version: listing.version },
      data: { ...data, status, version: { increment: 1 } },
    });
    if (updated.count === 0) throw await this.staleNow(listing.id);
  }

  /**
   * Saves an owner's change of `kind` with the status the table gives, counting the version up. Fails
   * with 409 when the listing changed in between (its version moved on).
   */
  async write(listing: Listing, data: DraftData, kind: EditKind, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    const status = nextStatus(listing.status, 'edit', kind);
    if (status === null || status === 'REMOVED') throw invalidStatus(listing.status);
    const changes = { ...data, ...(status === 'PENDING_REVIEW' && { submittedAt: this.clock.now() }) };
    await this.transition(listing, status, changes as Prisma.ListingUncheckedUpdateManyInput, tx);
  }

  /**
   * A listing that was never public (draft, rejected, or in its first review) is deleted for good,
   * photo files included; one that was ever published is archived: it disappears for everyone but
   * stays for the deals that point at it. Decided with the row locked, so a photo upload or a
   * submit at the same moment is either before or after, never lost in between.
   */
  async remove(id: string, ownerId: string): Promise<void> {
    await this.owned(id, ownerId);
    const removedKeys = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;
      const listing = await tx.listing.findUniqueOrThrow({ where: { id }, include: { photos: true } });
      if (nextStatus(listing.status, 'delete') === null) throw invalidStatus(listing.status);
      if (listing.publishedAt === null) {
        await tx.listing.delete({ where: { id } });
        return listing.photos.map((photo) => photo.storageKey);
      }
      await tx.listing.update({ where: { id }, data: { status: 'ARCHIVED', version: { increment: 1 } } });
      return [];
    });
    await this.forgetFiles(removedKeys);
  }

  /** Deletes stored photo files; a failure is logged, never thrown (the database no longer points at them). */
  async forgetFiles(keys: string[]): Promise<void> {
    const results = await Promise.allSettled(keys.map((key) => this.storage.delete(key)));
    for (const result of results) {
      if (result.status === 'rejected') {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.logger.error(`could not delete a stored photo: ${reason}`);
      }
    }
  }

  stale(currentVersion: number): AppError {
    return new AppError('INVALID_STATUS', 409, 'The listing changed elsewhere; reload it', undefined, { currentVersion });
  }

  async staleNow(id: string): Promise<AppError> {
    const current = await this.prisma.listing.findUnique({ where: { id }, select: { version: true } });
    return current ? this.stale(current.version) : notFound();
  }

  /**
   * Turns a draft into column values: the category must exist and be active, and attributes are
   * checked against it (draft mode: required ones may be missing). A new category clears the
   * attributes of the old one unless new attributes come along.
   */
  private async draftData(listing: Listing | null, draft: ListingDraft): Promise<{ data: DraftData; category: CategoryForListing | null }> {
    const { attributes, rules, ...plain } = draft;
    const data: DraftData = { ...plain };
    const fields: Record<string, string> = {};

    const categoryId = draft.categoryId !== undefined ? draft.categoryId : (listing?.categoryId ?? null);
    const category = categoryId === null ? null : await this.categories.forListing(categoryId);
    if (categoryId !== null && category === null && draft.categoryId !== undefined) {
      fields['categoryId'] = 'No such category';
    }
    const categoryChanged = draft.categoryId !== undefined && draft.categoryId !== (listing?.categoryId ?? null);

    if (attributes !== undefined) {
      if (category === null) {
        if (Object.keys(attributes).length > 0) fields['attributes'] = 'Choose a category first';
        else data.attributes = {};
      } else {
        const checked = validateAttributes(attributes, category.attributes, 'draft');
        if (checked.ok) data.attributes = checked.value;
        else Object.assign(fields, checked.fields);
      }
    } else if (categoryChanged) {
      data.attributes = {};
    }
    if (rules !== undefined) data.rules = rules;

    if (Object.keys(fields).length > 0) throw new AppError('VALIDATION_FAILED', 400, undefined, fields);
    return { data, category };
  }
}
