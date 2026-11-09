import { z } from 'zod';
import { LocalDateSchema, PhotoUrlsSchema } from './listings';
import { cleanText } from './text';

/** Statuses of a deal (BOOKING_STATUSES of @yoyo/domain; an API test keeps the two lists equal). */
export const BOOKING_STATUSES = [
  'REQUESTED',
  'ACCEPTED',
  'PAID',
  'ACTIVE',
  'RETURNED',
  'DAMAGE_CLAIMED',
  'DISPUTED',
  'COMPLETED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Deadlines of a deal (TIMER_KINDS of @yoyo/domain). */
export const BOOKING_TIMERS = [
  'REQUEST_EXPIRY',
  'PAYMENT_EXPIRY',
  'HANDOVER_DEADLINE',
  'HANDOVER_CONFIRM',
  'RETURN_CONFIRM',
  'INSPECTION',
  'DAMAGE_REPLY',
] as const;

/** Every step a side or an administrator can take (BookingEventType of @yoyo/domain, without TIMEOUT). */
export const BOOKING_ACTIONS = [
  'ACCEPT',
  'DECLINE',
  'WITHDRAW',
  'SIGN',
  'PAY',
  'CANCEL',
  'MARK_HANDED_OVER',
  'CONFIRM_RECEIVED',
  'REPORT_NOT_RECEIVED',
  'MARK_RETURNED',
  'CONFIRM_RETURNED',
  'REPORT_NOT_RETURNED',
  'ALL_FINE',
  'REPORT_DAMAGE',
  'ACCEPT_DAMAGE',
  'REJECT_DAMAGE',
  'RESOLVE',
] as const;

export type BookingAction = (typeof BOOKING_ACTIONS)[number];

export const RESOLVE_DECISIONS = ['REFUND_DEPOSIT', 'DEPOSIT_TO_OWNER', 'REFUND_ALL', 'CONFIRM_HANDOVER'] as const;

export const PAYMENT_METHODS = ['WALLET', 'CARD'] as const;

export const BOOKING_LIMITS = {
  message: 1000,
  /** Reasons, notes and the administrator's comment (the domain's limit). */
  text: 2000,
  damageDescription: { min: 10, max: 2000 },
  damagePhotos: 8,
} as const;

/** Deals per page in lists. */
export const BOOKINGS_PAGE_SIZE = 20;

const isoOrNull = z.iso.datetime().nullable();

/** A user's text cleaned of HTML, from `min` to `max` characters after cleaning. */
const Text = (min: number, max: number) => z.string().max(max * 4).transform(cleanText).pipe(z.string().min(min).max(max));

export const QuoteSchema = z.object({
  days: z.number().int(),
  dailyCents: z.number().int(),
  baseCents: z.number().int(),
  discountPercent: z.number().int(),
  discountCents: z.number().int(),
  rentCents: z.number().int(),
  /** The fee percent applied; frozen into a booking when it is requested. */
  servicePercent: z.number().int(),
  serviceFeeCents: z.number().int(),
  /** The launch offer's last day when the percent came from it, otherwise null. */
  servicePromoUntil: LocalDateSchema.nullable(),
  depositCents: z.number().int(),
  totalCents: z.number().int(),
  ownerPayoutCents: z.number().int(),
  priceSource: z.enum(['LISTED', 'AGREED']),
});

export type QuoteView = z.infer<typeof QuoteSchema>;

export const PeriodSchema = z.object({ start: LocalDateSchema, end: LocalDateSchema });

export const QuoteQuerySchema = PeriodSchema;

export const QuoteResponseSchema = z.object({
  quote: QuoteSchema,
  /** Days already taken or closed by the owner (to cross out in the calendar). */
  blocked: z.array(PeriodSchema),
});

export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

export const BookingRequestSchema = z.object({
  listingId: z.string().min(1).max(100),
  start: LocalDateSchema,
  end: LocalDateSchema,
  /** An accepted price offer for exactly these days. */
  offerId: z.string().min(1).max(100).optional(),
  /** A note to the owner. */
  message: z
    .string()
    .max(BOOKING_LIMITS.message * 4)
    .transform(cleanText)
    .pipe(z.string().max(BOOKING_LIMITS.message))
    .optional(),
});

export type BookingRequest = z.infer<typeof BookingRequestSchema>;

const PartySchema = z.object({ id: z.string(), name: z.string() });

/** A deal as one of its sides (or an administrator) sees it. Money in whole cents, times in ISO 8601. */
export const BookingViewSchema = z.object({
  id: z.string(),
  status: z.enum(BOOKING_STATUSES),
  viewerRole: z.enum(['RENTER', 'OWNER', 'ADMIN']),
  listing: z.object({
    id: z.string(),
    title: z.string(),
    coverUrl: z.string().nullable(),
    city: z.string().nullable(),
    district: z.string().nullable(),
  }),
  renter: PartySchema,
  owner: PartySchema,
  period: PeriodSchema,
  timeZone: z.string(),
  message: z.string().nullable(),
  quote: QuoteSchema,
  renterSignedAt: isoOrNull,
  ownerSignedAt: isoOrNull,
  paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
  ownerHandedOverAt: isoOrNull,
  renterReceivedAt: isoOrNull,
  renterReturnedAt: isoOrNull,
  ownerReceivedBackAt: isoOrNull,
  declineReason: z.string().nullable(),
  damage: z.object({ description: z.string(), photoIds: z.array(z.string()), claimedAt: z.iso.datetime() }).nullable(),
  dispute: z
    .object({
      reason: z.enum(['DAMAGE', 'NOT_RETURNED', 'NOT_HANDED_OVER']),
      openedAt: z.iso.datetime(),
      note: z.string().nullable(),
      resolution: z.object({ decision: z.enum(RESOLVE_DECISIONS), comment: z.string(), at: z.iso.datetime() }).nullable(),
    })
    .nullable(),
  cancellation: z.object({ by: z.enum(['RENTER', 'OWNER', 'ADMIN']), reason: z.string().nullable(), at: z.iso.datetime() }).nullable(),
  outcome: z.enum(['DEPOSIT_REFUNDED', 'DEPOSIT_TO_OWNER', 'REFUNDED_ALL']).nullable(),
  /** The armed deadline: what happens by itself, and when. */
  deadline: z.object({ timer: z.enum(BOOKING_TIMERS), dueAt: z.iso.datetime() }).nullable(),
  /** What the viewer can do now, one button each (availableActions of @yoyo/domain). */
  actions: z.array(z.enum(BOOKING_ACTIONS)),
  /** The contract PDF exists (from ACCEPTED on). */
  hasContract: z.boolean(),
  /** Send it back with every action (optimistic locking). */
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  completedAt: isoOrNull,
});

export type BookingView = z.infer<typeof BookingViewSchema>;

export const BookingResponseSchema = z.object({ booking: BookingViewSchema });

export type BookingResponse = z.infer<typeof BookingResponseSchema>;

/** Statuses a deal never leaves. */
export const CLOSED_BOOKING_STATUSES = ['COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED'] as const satisfies readonly BookingStatus[];

/** `open`: the deal is still going; `closed`: it ended (CLOSED_BOOKING_STATUSES). */
export const BOOKING_GROUPS = ['open', 'closed'] as const;

export type BookingGroup = (typeof BOOKING_GROUPS)[number];

export const MyBookingsQuerySchema = z.object({
  role: z.enum(['renter', 'owner']),
  status: z.enum(BOOKING_STATUSES).optional(),
  /** Open or closed deals; ignored when `status` is given. */
  group: z.enum(BOOKING_GROUPS).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

const RoleSummarySchema = z.object({
  /** Deals still going. */
  open: z.number().int(),
  /** Open deals where the viewer has a step to take now. */
  needsAction: z.number().int(),
});

/** Counters for the tabs of "My deals" and the user menu. */
export const MyBookingsSummarySchema = z.object({ renter: RoleSummarySchema, owner: RoleSummarySchema });

export type MyBookingsSummary = z.infer<typeof MyBookingsSummarySchema>;

/** One step of a deal's journal, as its sides see it (no notes, no card data). */
export const BookingHistoryItemSchema = z.object({
  /** The domain event (`ACCEPT`, `PAY`, `TIMEOUT`…) or `REQUEST` for the first one. */
  type: z.string(),
  actor: z.enum(['RENTER', 'OWNER', 'ADMIN', 'SYSTEM']),
  fromStatus: z.enum(BOOKING_STATUSES).nullable(),
  toStatus: z.enum(BOOKING_STATUSES),
  at: z.iso.datetime(),
});

export type BookingHistoryItem = z.infer<typeof BookingHistoryItemSchema>;

export const BookingHistoryResponseSchema = z.object({ items: z.array(BookingHistoryItemSchema) });

export type BookingHistoryResponse = z.infer<typeof BookingHistoryResponseSchema>;

/** What anyone needs to price and book a published listing: the domain's `quote` inputs and the taken days. */
export const BookingTermsSchema = z.object({
  listing: z.object({
    id: z.string(),
    title: z.string(),
    coverUrl: z.string().nullable(),
    city: z.string().nullable(),
    district: z.string().nullable(),
    ownerId: z.string(),
    ownerName: z.string(),
  }),
  pricing: z.object({
    dailyCents: z.number().int(),
    weeklyDiscountPercent: z.number().int(),
    depositCents: z.number().int(),
    minDays: z.number().int(),
    maxDays: z.number().int(),
  }),
  /** The fee percent a request sent now pays (the launch offer's while it lasts). */
  servicePercent: z.number().int(),
  /** The launch offer's last day while it lasts, otherwise null. */
  servicePromoUntil: LocalDateSchema.nullable(),
  /** The fee after the launch offer. */
  regularServicePercent: z.number().int(),
  /** The latest first day of a request, counted from `today`. */
  maxAdvanceDays: z.number().int(),
  timeZone: z.string(),
  /** Today in the listing's time zone: the earliest first day. */
  today: LocalDateSchema,
  blocked: z.array(PeriodSchema),
});

export type BookingTerms = z.infer<typeof BookingTermsSchema>;

export const BookingsPageSchema = z.object({ items: z.array(BookingViewSchema), total: z.number().int() });

export type BookingsPage = z.infer<typeof BookingsPageSchema>;

const reason = Text(1, BOOKING_LIMITS.text);

/** A step of one side, as `POST /bookings/:id/events` takes it (the domain's BookingEvent). */
export const BookingEventInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ACCEPT') }),
  z.object({ type: z.literal('DECLINE'), reason: reason.optional() }),
  z.object({ type: z.literal('WITHDRAW') }),
  z.object({ type: z.literal('SIGN') }),
  /** From the wallet, or by card with a token from POST /payments/card-tokens. */
  z
    .object({
      type: z.literal('PAY'),
      method: z.enum(PAYMENT_METHODS),
      cardToken: z.string().min(10).max(1000).regex(/^tok_[A-Za-z0-9_.-]+$/, 'Not a card token').optional(),
    })
    .refine((pay) => (pay.method === 'CARD') === (pay.cardToken !== undefined), {
      path: ['cardToken'],
      message: 'A card payment needs a card token; a wallet payment takes none',
    }),
  z.object({ type: z.literal('CANCEL'), reason }),
  z.object({ type: z.literal('MARK_HANDED_OVER') }),
  z.object({ type: z.literal('CONFIRM_RECEIVED') }),
  z.object({ type: z.literal('REPORT_NOT_RECEIVED'), note: reason }),
  z.object({ type: z.literal('MARK_RETURNED') }),
  z.object({ type: z.literal('CONFIRM_RETURNED') }),
  z.object({ type: z.literal('REPORT_NOT_RETURNED'), note: reason }),
  z.object({ type: z.literal('ALL_FINE') }),
  z.object({
    type: z.literal('REPORT_DAMAGE'),
    description: Text(BOOKING_LIMITS.damageDescription.min, BOOKING_LIMITS.damageDescription.max),
    photoIds: z.array(z.string().min(1).max(100)).min(1).max(BOOKING_LIMITS.damagePhotos),
  }),
  z.object({ type: z.literal('ACCEPT_DAMAGE') }),
  z.object({ type: z.literal('REJECT_DAMAGE'), note: reason }),
]);

export type BookingEventInput = z.infer<typeof BookingEventInputSchema>;

export const BookingActionRequestSchema = z.object({
  version: z.number().int().min(0),
  event: BookingEventInputSchema,
});

export type BookingActionRequest = z.infer<typeof BookingActionRequestSchema>;

export const ResolveRequestSchema = z.object({
  version: z.number().int().min(0),
  decision: z.enum(RESOLVE_DECISIONS),
  comment: reason,
});

export type ResolveRequest = z.infer<typeof ResolveRequestSchema>;

export const BOOKING_PHOTO_KINDS = ['HANDOVER', 'RETURN', 'DAMAGE'] as const;

export type BookingPhotoKind = (typeof BOOKING_PHOTO_KINDS)[number];

/** A photo of the item's condition at handover or return, or of damage. */
export const BookingPhotoSchema = z.object({
  id: z.string(),
  kind: z.enum(BOOKING_PHOTO_KINDS),
  uploaderId: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  urls: PhotoUrlsSchema,
  createdAt: z.iso.datetime(),
});

export type BookingPhoto = z.infer<typeof BookingPhotoSchema>;

export const BookingPhotoUploadQuerySchema = z.object({ kind: z.enum(BOOKING_PHOTO_KINDS) });

export const BookingPhotoResponseSchema = z.object({ photo: BookingPhotoSchema });

export type BookingPhotoResponse = z.infer<typeof BookingPhotoResponseSchema>;

export const BookingPhotosResponseSchema = z.object({ items: z.array(BookingPhotoSchema) });

export type BookingPhotosResponse = z.infer<typeof BookingPhotosResponseSchema>;
