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
  'CATEGORY_CREATED',
  'CATEGORY_DELETED',
  'USER_CREATED',
  'USER_EDITED',
  'USER_DELETED',
  'STAFF_CHANGED',
  'TWO_FACTOR_RESET',
  'IDENTITY_VIEWED',
  'IDENTITY_APPROVED',
  'IDENTITY_REJECTED',
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

/** Everything about one person for an administrator (Admin → Users → a person). */
export const AdminUserDetailSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['USER', 'ADMIN']),
    locale: z.string(),
    city: z.string().min(1).nullable(),
    about: z.string().min(1).nullable(),
    emailVerified: z.boolean(),
    phoneVerified: z.boolean(),
    createdAt: z.iso.datetime(),
    blockedAt: z.iso.datetime().nullable(),
    deletedAt: z.iso.datetime().nullable(),
    lastSeenAt: z.iso.datetime().nullable(),
  }),
  stats: z.object({
    listings: z.number().int(),
    dealsAsRenter: z.number().int(),
    dealsAsOwner: z.number().int(),
    completed: z.number().int(),
    rating: z.number().nullable(),
    reviews: z.number().int(),
    walletCents: z.number().int(),
    earnedCents: z.number().int(),
    reportsAgainst: z.number().int(),
  }),
  listings: z.array(z.object({ id: z.string(), title: z.string(), status: z.string(), dailyCents: z.number().int().nullable(), updatedAt: z.iso.datetime() })),
  deals: z.array(z.object({ id: z.string(), title: z.string(), status: z.string(), role: z.enum(['RENTER', 'OWNER']), totalCents: z.number().int(), createdAt: z.iso.datetime() })),
  reviews: z.array(
    z.object({ id: z.string(), rating: z.number().int(), text: z.string(), author: z.string(), createdAt: z.iso.datetime(), hidden: z.boolean() }),
  ),
  reports: z.array(z.object({ id: z.string(), reason: z.string(), note: z.string(), status: z.string(), createdAt: z.iso.datetime() })),
  notes: z.array(z.object({ id: z.string(), text: z.string(), admin: z.string(), createdAt: z.iso.datetime() })),
});
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;

export const AdminNoteRequestSchema = z.object({ text: z.string().trim().min(1).max(2000) });
/** Taking a listing down or hiding a review needs a reason (the owner is told it, the log keeps it). */
export const AdminReasonSchema = z.object({ reason: z.string().trim().min(3).max(1000) });

/** Admin search (⌘K): people, items and deals matching a few letters, an email or an id. */
export const AdminSearchSchema = z.object({
  users: z.array(z.object({ id: z.string(), name: z.string(), email: z.string(), blocked: z.boolean() })),
  listings: z.array(z.object({ id: z.string(), title: z.string(), status: z.string(), owner: z.string() })),
  deals: z.array(z.object({ id: z.string(), title: z.string(), status: z.string(), renter: z.string(), owner: z.string() })),
});
export type AdminSearch = z.infer<typeof AdminSearchSchema>;

/** Admin → System: is everything running, and how close to the limits. */
export const AdminSystemSchema = z.object({
  version: z.string(),
  uptimeSeconds: z.number().int(),
  database: z.object({ ok: z.boolean(), latencyMs: z.number().int() }),
  mail: z.object({ sent: z.number().int(), limit: z.number().int() }),
  /** Deal deadlines past due that nobody ran yet (should be 0; more means the timer job is not running). */
  overdueTimers: z.number().int(),
  storage: z.string(),
  payments: z.string(),
  counts: z.object({ users: z.number().int(), listings: z.number().int(), bookings: z.number().int(), messages: z.number().int(), reviews: z.number().int() }),
});
export type AdminSystem = z.infer<typeof AdminSystemSchema>;

export const ADMIN_EXPORTS = ['users', 'listings', 'deals', 'ledger'] as const;
export type AdminExport = (typeof ADMIN_EXPORTS)[number];

const Names = z.object({ en: z.string(), lv: z.string(), ru: z.string() });

/** One category for administrators: the names from the catalog, the admin's own over them, order, hiding. */
const AdminCategoryLeafSchema = z.object({
  id: z.string(),
  slug: z.string(),
  names: Names,
  defaultNames: Names,
  renamed: z.boolean(),
  hidden: z.boolean(),
  items: z.number().int(),
  /** Made in the admin panel (not in the code catalog). */
  custom: z.boolean(),
  /** Every listing in it, drafts included (what a deletion would move). */
  allListings: z.number().int(),
});
/** The catalog has two levels: a root and its subcategories. */
export const AdminCategorySchema = AdminCategoryLeafSchema.extend({ children: z.array(AdminCategoryLeafSchema) });
export type AdminCategory = z.infer<typeof AdminCategorySchema>;
export const AdminCategoriesSchema = z.object({ categories: z.array(AdminCategorySchema) });

/** Rename (null: back to the catalog's names), move up or down among its siblings, hide or show. */
export const AdminCategoryChangeSchema = z
  .object({
    names: z.object({ en: z.string().trim().min(1).max(60), lv: z.string().trim().min(1).max(60), ru: z.string().trim().min(1).max(60) }).nullable().optional(),
    move: z.enum(['up', 'down']).optional(),
    hidden: z.boolean().optional(),
  })
  .refine((v) => v.names !== undefined || v.move !== undefined || v.hidden !== undefined, { message: 'Nothing to change' });
export type AdminCategoryChange = z.infer<typeof AdminCategoryChangeSchema>;

const CategoryNames = z.object({ en: z.string().trim().min(1).max(60), lv: z.string().trim().min(1).max(60), ru: z.string().trim().min(1).max(60) });

/** A new category: a root (parentId null) or a subcategory of a root. */
export const AdminCategoryCreateSchema = z.object({ names: CategoryNames, parentId: z.string().min(1).nullable() });
export type AdminCategoryCreate = z.infer<typeof AdminCategoryCreateSchema>;
export const AdminCategoryCreatedSchema = z.object({ id: z.string() });

/** Deleting a category that has listings: where they go (a subcategory that takes listings). */
export const AdminCategoryDeleteQuerySchema = z.object({ moveTo: z.string().min(1).optional() });

/** A person the administrator adds: a confirmed account; without a password they get a link to set one. */
export const AdminUserCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(8).max(128).optional(),
  locale: z.enum(['en', 'lv', 'ru']).default('en'),
});
export type AdminUserCreate = z.infer<typeof AdminUserCreateSchema>;
export const AdminUserCreatedSchema = z.object({ id: z.string(), passwordLinkSent: z.boolean() });

/** An administrator's correction of a person's profile. */
export const AdminUserEditSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)).optional(),
    city: z.string().trim().max(60).nullable().optional(),
    about: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nothing to change' });
export type AdminUserEdit = z.infer<typeof AdminUserEditSchema>;
