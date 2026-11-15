import { z } from 'zod';
import { BOOKING_STATUSES } from './bookings';

/** How long one chat message may be (characters, after trimming). */
export const MESSAGE_TEXT = { max: 2000 } as const;

/** A message to send: plain text, never rendered as HTML. */
export const MessageRequestSchema = z.object({
  text: z.string().trim().min(1).max(MESSAGE_TEXT.max),
});
export type MessageRequest = z.infer<typeof MessageRequestSchema>;

export const CHAT_ROLES = ['RENTER', 'OWNER'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

/**
 * One line of a conversation. TEXT is a person's message; SYSTEM is a step of a deal (`event` is the
 * deal status it reached, `bookingId` the deal), which the site words in the reader's language.
 */
export const ChatMessageSchema = z.object({
  id: z.string(),
  kind: z.enum(['TEXT', 'SYSTEM']),
  text: z.string(),
  event: z.enum(BOOKING_STATUSES).nullable(),
  bookingId: z.string().nullable(),
  mine: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatListingSchema = z.object({ id: z.string(), title: z.string(), photoUrl: z.string().nullable() });

/** A conversation in my list: the item, the other side, the newest line and how many I have not read. */
export const ConversationSummarySchema = z.object({
  id: z.string(),
  role: z.enum(CHAT_ROLES),
  /** The item it is about, or null for a direct conversation started from a profile. */
  listing: ChatListingSchema.nullable(),
  other: z.object({ id: z.string(), name: z.string() }),
  lastMessage: ChatMessageSchema.nullable(),
  lastMessageAt: z.iso.datetime(),
  unread: z.number().int().min(0),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const ConversationListSchema = z.object({ items: z.array(ConversationSummarySchema) });
export type ConversationList = z.infer<typeof ConversationListSchema>;

/** One conversation with its messages, oldest first (only those after `after`, when asked). */
export const ConversationThreadSchema = z.object({
  ...ConversationSummarySchema.shape,
  /** When the other side last read the conversation. */
  otherReadAt: z.iso.datetime().nullable(),
  /**
   * The newest deal on this item between the two, if any. `.min(1)` is there for the OpenAPI emitter:
   * a bare top-level `z.string().nullable()` comes out as `string[]`.
   */
  dealId: z.string().min(1).nullable(),
  messages: z.array(ChatMessageSchema),
});
export type ConversationThread = z.infer<typeof ConversationThreadSchema>;

/**
 * Owner, 2026-11-16: Messages are personal conversations only; a deal's conversation lives in the deal.
 * `direct` = started from a profile (no item); `deal` = about an item; omitted = both.
 */
export const ConversationKindQuerySchema = z.object({ kind: z.enum(['direct', 'deal']).optional() });

export const UnreadCountSchema = z.object({ count: z.number().int().min(0) });
export type UnreadCount = z.infer<typeof UnreadCountSchema>;
