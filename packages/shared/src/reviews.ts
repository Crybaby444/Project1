import { z } from 'zod';

/** How long a review's text may be (characters, after trimming). */
export const REVIEW_TEXT = { min: 10, max: 1000 } as const;

const Stars = z.number().int().min(1).max(5);

/**
 * A review after a completed deal: stars for the other person and a text; the renter also scores the
 * item (`itemRating`, required of the renter by the API).
 */
export const ReviewRequestSchema = z.object({
  rating: Stars,
  itemRating: Stars.optional(),
  text: z.string().trim().min(REVIEW_TEXT.min).max(REVIEW_TEXT.max),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

export const REVIEW_ROLES = ['RENTER', 'OWNER'] as const;
export type ReviewRole = (typeof REVIEW_ROLES)[number];

/** A review as anyone may read it once it is public. `authorRole` is the author's side of the deal. */
export const PublicReviewSchema = z.object({
  id: z.string(),
  rating: Stars,
  itemRating: Stars.nullable(),
  text: z.string(),
  createdAt: z.iso.datetime(),
  author: z.object({ id: z.string(), name: z.string() }),
  authorRole: z.enum(REVIEW_ROLES),
  listing: z.object({ id: z.string(), title: z.string() }).nullable(),
});

export type PublicReview = z.infer<typeof PublicReviewSchema>;

/**
 * The reviews of one deal as a side of it sees them: whether they may still write theirs (and until
 * when), theirs, and the other side's once it is public (blind until both wrote or the window closed).
 */
export const DealReviewsSchema = z.object({
  canReview: z.boolean(),
  deadline: z.iso.datetime().nullable(),
  viewerRole: z.enum(REVIEW_ROLES),
  mine: PublicReviewSchema.nullable(),
  theirs: PublicReviewSchema.nullable(),
  /** The other side has written theirs, but it is still hidden (blind). */
  theirsWaiting: z.boolean(),
});

export type DealReviews = z.infer<typeof DealReviewsSchema>;

export const ReviewPageSchema = z.object({
  items: z.array(PublicReviewSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  /** The average of the stars on this page's subject (one decimal), or null with no reviews. */
  average: z.number().nullable(),
});

export type ReviewPage = z.infer<typeof ReviewPageSchema>;
