import type { BookingStatus, Prisma } from '../generated/prisma/client';

export interface DealLine {
  bookingId: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  /** The status the deal reached; the site words it in each reader's language. */
  status: BookingStatus;
  now: Date;
}

/**
 * Writes a deal step into the item's conversation between its two sides, in the deal's own transaction,
 * so the line and the step are saved together or not at all. Starts the conversation when there is none.
 */
export async function writeDealLine(tx: Prisma.TransactionClient, line: DealLine): Promise<void> {
  const conversation = await tx.conversation.upsert({
    where: { listingId_renterId: { listingId: line.listingId, renterId: line.renterId } },
    create: { listingId: line.listingId, renterId: line.renterId, ownerId: line.ownerId, lastMessageAt: line.now, createdAt: line.now },
    update: { lastMessageAt: line.now },
  });
  await tx.message.create({
    data: { conversationId: conversation.id, kind: 'SYSTEM', event: line.status, bookingId: line.bookingId, createdAt: line.now },
  });
}
