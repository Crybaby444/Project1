import { z } from 'zod';
import { AdminUserSchema } from './auth';

export const ADMIN_ACTIVITY_KINDS = ['USER_JOINED', 'LISTING_SUBMITTED', 'DEAL_REQUESTED', 'DISPUTE_OPENED'] as const;
export type AdminActivityKind = (typeof ADMIN_ACTIVITY_KINDS)[number];

/** One line of the admin activity feed: what happened, when, to what (`id` of the user, listing or deal). */
export const AdminActivitySchema = z.object({
  kind: z.enum(ADMIN_ACTIVITY_KINDS),
  at: z.iso.datetime(),
  id: z.string(),
  title: z.string(),
  who: z.string(),
});
export type AdminActivity = z.infer<typeof AdminActivitySchema>;

/**
 * The admin panel's first screen: what waits for a decision, the size of the marketplace, the money
 * the platform holds, the last 14 days (UTC) and the newest activity.
 */
export const AdminOverviewSchema = z.object({
  users: z.object({ total: z.number().int(), new7d: z.number().int(), blocked: z.number().int() }),
  listings: z.object({ pendingReview: z.number().int(), published: z.number().int(), total: z.number().int() }),
  deals: z.object({
    /** Deals still going. */
    open: z.number().int(),
    /** Requests waiting for an owner's answer. */
    requested: z.number().int(),
    /** Disputes waiting for an administrator. */
    disputed: z.number().int(),
    completed30d: z.number().int(),
  }),
  money: z.object({
    /** What renters paid in deals completed in the last 30 days. */
    turnover30dCents: z.number().int(),
    revenueCents: z.number().int(),
    escrowCents: z.number().int(),
    depositsCents: z.number().int(),
    walletsCents: z.number().int(),
  }),
  /** The ledger audit found nothing wrong. */
  ledgerOk: z.boolean(),
  series: z.array(z.object({ day: z.string(), users: z.number().int(), deals: z.number().int() })),
  activity: z.array(AdminActivitySchema),
});
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

export const AdminUserResponseSchema = z.object({ user: AdminUserSchema });
export type AdminUserResponse = z.infer<typeof AdminUserResponseSchema>;
