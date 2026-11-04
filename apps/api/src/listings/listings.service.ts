import { isDeepStrictEqual } from 'node:util';
import { Inject, Injectable } from '@nestjs/common';
import {
  validateAttributes,
  type ListingDraft,
  type ListingPatch,
  type ListingStatus,
  type OwnerListing,
  type OwnerListingSummary,
  type PublicUser,
} from '@yoyo/shared';
import { CategoriesService } from '../categories/categories.service';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Listing, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { nextStatus, type EditKind } from './listing-status';
import { serializeListing, serializeSummary, type ListingWithRelations, type UrlFor } from './listing.serializer';

/** Fields whose change sends a live listing back to review; every other field is a term. */
const CONTENT_FIELDS = ['title', 'description', 'categoryId', 'attributes', 'condition'] as const;

const WITH_RELATIONS = { photos: true, unavailability: true } as const;

type DraftData = Omit<Prisma.ListingUncheckedUpdateInput, 'id' | 'ownerId' | 'status' | 'version'>;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Where each photo size is served. */
  readonly urlFor: UrlFor = (key, variant) => `/api/v1/media/${key}/${variant}`;

  async create(ownerId: string, draft: ListingDraft): Promise<OwnerListing> {
    const data = await this.draftData(null, draft);
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

    const data = await this.draftData(listing, draft);
    const changed = (Object.keys(data) as (keyof ListingDraft)[]).filter(
      (key) => !isDeepStrictEqual(data[key as keyof DraftData], currentValue(listing, key)),
    );
    if (changed.length === 0) return serializeListing(listing, 'owner', this.urlFor);
    const kind: EditKind = changed.some((key) => (CONTENT_FIELDS as readonly string[]).includes(key)) ? 'content' : 'terms';
    await this.write(listing, Object.fromEntries(changed.map((key) => [key, data[key as keyof DraftData]])), kind);
    return this.serialize(id);
  }

  /**
   * Saves an owner's change of `kind` with the status the table gives, counting the version up. Fails
   * with 409 when the listing changed in between (its version moved on).
   */
  async write(listing: Listing, data: DraftData, kind: EditKind, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    const status = nextStatus(listing.status, 'edit', kind);
    if (status === null || status === 'REMOVED') throw invalidStatus(listing.status);
    const updated = await tx.listing.updateMany({
      where: { id: listing.id, version: listing.version },
      data: {
        ...data,
        status,
        ...(status === 'PENDING_REVIEW' && { submittedAt: this.clock.now() }),
        version: { increment: 1 },
      } as Prisma.ListingUncheckedUpdateManyInput,
    });
    if (updated.count === 0) throw await this.staleNow(listing.id);
  }

  /**
   * Drafts and rejected listings that were never public are deleted for good; anything that was
   * published is archived: it disappears for everyone but stays for the deals that point at it.
   */
  async remove(id: string, ownerId: string): Promise<{ removed: ListingWithRelations | null }> {
    const listing = await this.owned(id, ownerId);
    const next = nextStatus(listing.status, 'delete');
    if (next === null) throw invalidStatus(listing.status);
    if (next === 'REMOVED' && listing.publishedAt === null) {
      await this.prisma.listing.delete({ where: { id } });
      return { removed: listing };
    }
    await this.prisma.listing.update({ where: { id }, data: { status: 'ARCHIVED', version: { increment: 1 } } });
    return { removed: null };
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
  private async draftData(listing: Listing | null, draft: ListingDraft): Promise<DraftData> {
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
    return data;
  }
}
