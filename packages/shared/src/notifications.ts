import { z } from 'zod';

/** What a bell notification is about. */
export const NOTIFICATION_KINDS = ['DEAL', 'OFFER', 'LISTING', 'REVIEW'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * One bell notification. `event` names what happened (a deal template such as REQUESTED, an offer's
 * OFFER_MADE, a listing's APPROVED, a review's RECEIVED); the site words it in the reader's language.
 */
export const NotificationSchema = z.object({
  id: z.string(),
  kind: z.enum(NOTIFICATION_KINDS),
  event: z.string(),
  bookingId: z.string().nullable(),
  listingId: z.string().nullable(),
  title: z.string(),
  createdAt: z.iso.datetime(),
  readAt: z.iso.datetime().nullable(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationListSchema = z.object({ unread: z.number().int().min(0), items: z.array(NotificationSchema) });
export type NotificationList = z.infer<typeof NotificationListSchema>;

/**
 * Email topics a person may turn off (spec §4.7). Signing in, confirming the email and resetting the
 * password are not topics: that mail always goes.
 */
export const EMAIL_TOPICS = ['DEALS', 'OFFERS', 'LISTINGS'] as const;
export type EmailTopic = (typeof EMAIL_TOPICS)[number];

export const EmailPreferencesSchema = z.object({ off: z.array(z.enum(EMAIL_TOPICS)).max(EMAIL_TOPICS.length) });
export type EmailPreferences = z.infer<typeof EmailPreferencesSchema>;
