import { z } from 'zod';
import { SETTING_DEFAULTS, type SettingKey } from './settings';

/** What an administrator did (the audit log's `action`). */
export const AUDIT_ACTIONS = [
  'LISTING_APPROVED',
  'LISTING_REJECTED',
  'LISTING_MOVED',
  'LISTING_HIDDEN',
  'LISTING_SHOWN',
  'DISPUTE_RESOLVED',
  'USER_BLOCKED',
  'USER_UNBLOCKED',
  'USER_NOTE',
  'REPORT_CLOSED',
  'REVIEW_HIDDEN',
  'REVIEW_SHOWN',
  'SETTINGS_CHANGED',
  'CATEGORY_CHANGED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AuditEntrySchema = z.object({
  id: z.string(),
  admin: z.object({ id: z.string().min(1).nullable(), name: z.string() }),
  action: z.enum(AUDIT_ACTIONS),
  targetType: z.string(),
  targetId: z.string().min(1).nullable(),
  summary: z.string(),
  before: z.unknown(),
  after: z.unknown(),
  createdAt: z.iso.datetime(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const ADMIN_AUDIT_PAGE_SIZE = 50;
export const AdminAuditQuerySchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  targetId: z.string().max(64).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
export const AdminAuditListSchema = z.object({ items: z.array(AuditEntrySchema), total: z.number().int() });
export type AdminAuditList = z.infer<typeof AdminAuditListSchema>;

/** Every runtime setting with its current value, its default and whether it was changed from it. */
export const AdminSettingsSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      value: z.union([z.number(), z.string()]),
      default: z.union([z.number(), z.string()]),
      changed: z.boolean(),
    }),
  ),
});
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;

const Hours = z.number().int().min(1).max(720);
/** What an administrator may change, each in a range the deal rules accept. */
export const AdminSettingsChangeSchema = z
  .object({
    'booking.requestTtlHours': Hours,
    'booking.paymentTtlHours': Hours,
    'booking.handoverConfirmHours': Hours,
    'booking.returnConfirmHours': Hours,
    'booking.inspectionHours': Hours,
    'booking.damageReplyHours': Hours,
    'booking.maxAdvanceDays': z.number().int().min(1).max(730),
    'review.windowDays': z.number().int().min(1).max(90),
    'fees.servicePercent': z.number().int().min(0).max(50),
    'fees.promoServicePercent': z.number().int().min(0).max(50),
    'fees.promoServiceUntil': z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  } satisfies Record<SettingKey, z.ZodType>)
  .partial();
export type AdminSettingsChange = z.infer<typeof AdminSettingsChangeSchema>;
export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as SettingKey[];
