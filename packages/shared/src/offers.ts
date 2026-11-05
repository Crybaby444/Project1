import { z } from 'zod';
import { LocalDateSchema } from './listings';

export const OFFER_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'USED'] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

/** A renter's own daily price for given days (spec §4.6). */
export const OfferRequestSchema = z.object({
  start: LocalDateSchema,
  end: LocalDateSchema,
  dailyCents: z.number().int().min(1).max(1_000_000),
});

export type OfferRequest = z.infer<typeof OfferRequestSchema>;

export const OfferViewSchema = z.object({
  id: z.string(),
  listing: z.object({ id: z.string(), title: z.string() }),
  renter: z.object({ id: z.string(), name: z.string() }),
  owner: z.object({ id: z.string(), name: z.string() }),
  start: LocalDateSchema,
  end: LocalDateSchema,
  dailyCents: z.number().int(),
  listedDailyCents: z.number().int(),
  status: z.enum(OFFER_STATUSES),
  /** Until when the owner can answer (PENDING) or the renter can book with it (ACCEPTED). */
  expiresAt: z.iso.datetime(),
  answeredAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type OfferView = z.infer<typeof OfferViewSchema>;

export const OfferResponseSchema = z.object({ offer: OfferViewSchema });

export type OfferResponse = z.infer<typeof OfferResponseSchema>;

export const MyOffersQuerySchema = z.object({ role: z.enum(['renter', 'owner']) });

export const OffersResponseSchema = z.object({ items: z.array(OfferViewSchema) });

export type OffersResponse = z.infer<typeof OffersResponseSchema>;
