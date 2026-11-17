import { z } from 'zod';

/**
 * Everything people do on Yoyo, for the admin (owner, 2026-11-16: "I want to see all user activity, with
 * filters: registration, new listings, deletions, activity…"). What happened, who, to what; never the
 * words of a message.
 */
export const ACTIVITY_KINDS = [
  'USER_REGISTERED',
  'USER_SIGNED_IN',
  'USER_DELETED',
  'PROFILE_UPDATED',
  'IDENTITY_SUBMITTED',
  'LISTING_CREATED',
  'LISTING_SUBMITTED',
  'LISTING_DELETED',
  'BOOKING_REQUESTED',
  'BOOKING_STEP',
  'OFFER_MADE',
  'MESSAGE_SENT',
  'REVIEW_WRITTEN',
  'REPORT_FILED',
  'FOLLOWED',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** The filter groups of the admin page. */
export const ACTIVITY_GROUPS = {
  accounts: ['USER_REGISTERED', 'USER_SIGNED_IN', 'USER_DELETED', 'PROFILE_UPDATED', 'IDENTITY_SUBMITTED'],
  listings: ['LISTING_CREATED', 'LISTING_SUBMITTED', 'LISTING_DELETED'],
  deals: ['BOOKING_REQUESTED', 'BOOKING_STEP', 'OFFER_MADE', 'REVIEW_WRITTEN'],
  messages: ['MESSAGE_SENT'],
  reports: ['REPORT_FILED'],
  social: ['FOLLOWED'],
} as const satisfies Record<string, readonly ActivityKind[]>;
export type ActivityGroup = keyof typeof ACTIVITY_GROUPS;

export const ActivityQuerySchema = z.object({
  group: z.enum(Object.keys(ACTIVITY_GROUPS) as [ActivityGroup, ...ActivityGroup[]]).optional(),
  kind: z.enum(ACTIVITY_KINDS).optional(),
  userId: z.string().min(1).max(40).optional(),
  /** The `next` of the page before: events older than it. */
  before: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;

export const ActivityEventSchema = z.object({
  id: z.string(),
  kind: z.enum(ACTIVITY_KINDS),
  actor: z.object({ id: z.string(), name: z.string(), username: z.string().nullable() }).nullable(),
  targetType: z.enum(['USER', 'LISTING', 'BOOKING', 'OFFER', 'CONVERSATION', 'REVIEW', 'REPORT']).nullable(),
  targetId: z.string().nullable(),
  /** A short line: a title, a deal step, a name; never the text of a message. */
  summary: z.string(),
  at: z.iso.datetime(),
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

export const ActivityPageSchema = z.object({ items: z.array(ActivityEventSchema), next: z.string().max(80).nullable() });
export type ActivityPage = z.infer<typeof ActivityPageSchema>;
