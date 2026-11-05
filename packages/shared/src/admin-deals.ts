import { z } from 'zod';
import { BOOKING_STATUSES, BookingPhotoSchema, BookingViewSchema } from './bookings';
import { LEDGER_KINDS } from './wallet';

export const ADMIN_PAGE_SIZE = 50;

export const AdminBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  /** Only deals waiting for a decision (DISPUTED), the longest waiting first. */
  disputed: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export const AdminBookingsResponseSchema = z.object({ items: z.array(BookingViewSchema), total: z.number().int() });

export type AdminBookingsResponse = z.infer<typeof AdminBookingsResponseSchema>;

export const PostingSchema = z.object({ account: z.string(), amount: z.number().int() });

export const LedgerOperationViewSchema = z.object({
  id: z.string(),
  kind: z.enum(LEDGER_KINDS),
  bookingId: z.string().nullable(),
  userId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  postings: z.array(PostingSchema),
});

export type LedgerOperationView = z.infer<typeof LedgerOperationViewSchema>;

export const BookingJournalEntrySchema = z.object({
  id: z.string(),
  type: z.string(),
  actorKind: z.string(),
  actorId: z.string().nullable(),
  fromStatus: z.enum(BOOKING_STATUSES).nullable(),
  toStatus: z.enum(BOOKING_STATUSES),
  data: z.record(z.string(), z.unknown()),
  messages: z.array(z.string()),
  createdAt: z.iso.datetime(),
});

export const AdminPaymentSchema = z.object({
  id: z.string(),
  amountCents: z.number().int(),
  refundedCents: z.number().int(),
  brand: z.string(),
  last4: z.string(),
  createdAt: z.iso.datetime(),
  refunds: z.array(z.object({ id: z.string(), amountCents: z.number().int(), status: z.enum(['PENDING', 'DONE', 'FAILED']), createdAt: z.iso.datetime() })),
});

export const AdminBookingDetailSchema = z.object({
  booking: BookingViewSchema,
  events: z.array(BookingJournalEntrySchema),
  operations: z.array(LedgerOperationViewSchema),
  photos: z.array(BookingPhotoSchema),
  payments: z.array(AdminPaymentSchema),
});

export type AdminBookingDetail = z.infer<typeof AdminBookingDetailSchema>;

export const AdminLedgerQuerySchema = z.object({
  bookingId: z.string().max(100).optional(),
  account: z.string().max(200).optional(),
  kind: z.enum(LEDGER_KINDS).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export const AdminLedgerResponseSchema = z.object({ items: z.array(LedgerOperationViewSchema), total: z.number().int() });

export type AdminLedgerResponse = z.infer<typeof AdminLedgerResponseSchema>;

export const AdminAccountsQuerySchema = z.object({
  /** `wallet:`, `escrow:`, `deposit:`, `platform:` or `external:`. */
  prefix: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export const AdminAccountsResponseSchema = z.object({
  items: z.array(z.object({ id: z.string(), balance: z.number().int() })),
  total: z.number().int(),
});

export type AdminAccountsResponse = z.infer<typeof AdminAccountsResponseSchema>;

export const LedgerSummarySchema = z.object({
  revenueCents: z.number().int(),
  escrowCents: z.number().int(),
  depositsCents: z.number().int(),
  walletsCents: z.number().int(),
  /** Below zero: money that came in from cards and has not gone back out. */
  externalCents: z.number().int(),
  audit: z.object({
    sumOfAll: z.number().int(),
    mismatched: z.array(z.object({ account: z.string(), cached: z.number().int(), fromEntries: z.number().int() })),
    unbalancedOperations: z.array(z.string()),
    negative: z.array(z.string()),
  }),
});

export type LedgerSummary = z.infer<typeof LedgerSummarySchema>;
