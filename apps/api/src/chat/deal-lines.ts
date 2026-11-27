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

/**
 * The renter's note to a request ("Could I pick it up after 18:00?") as their first line in the deal's chat,
 * just after the request's own line, so the owner reads and answers it where the conversation is.
 */
export async function writeRequestNote(
  tx: Prisma.TransactionClient,
  note: { listingId: string; renterId: string; ownerId: string; text: string; now: Date },
): Promise<void> {
  const conversation = await tx.conversation.upsert({
    where: { listingId_renterId: { listingId: note.listingId, renterId: note.renterId } },
    create: { listingId: note.listingId, renterId: note.renterId, ownerId: note.ownerId, lastMessageAt: note.now, createdAt: note.now },
    update: { lastMessageAt: note.now },
  });
  // A millisecond after the request's line, so the chat reads "request sent", then the note.
  const at = new Date(note.now.getTime() + 1);
  await tx.message.create({ data: { conversationId: conversation.id, authorId: note.renterId, kind: 'TEXT', text: note.text, createdAt: at } });
}
