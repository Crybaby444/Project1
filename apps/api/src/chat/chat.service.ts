import { Inject, Injectable } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { publicName } from '../common/public-name';
import type { BookingStatus as SharedStatus, ChatMessage, ChatRole, ConversationList, ConversationSummary, ConversationThread } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Message, Prisma } from '../generated/prisma/client';
import { STORAGE_PROVIDER, type StorageProvider } from '../media/storage.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/** The most conversations the list shows (newest first). */
const LIST_LIMIT = 100;
/** The most messages one thread answer carries (the newest ones). */
const THREAD_LIMIT = 300;

const CONVERSATION_INCLUDE = {
  listing: { select: { id: true, title: true, photos: { orderBy: { position: 'asc' }, take: 1, select: { storageKey: true } } } },
  renter: { select: { id: true, name: true, username: true, deletedAt: true } },
  owner: { select: { id: true, name: true, username: true, deletedAt: true } },
} as const satisfies Prisma.ConversationInclude;

type ConversationRow = Prisma.ConversationGetPayload<{ include: typeof CONVERSATION_INCLUDE }>;

/** Direct (no item) or about an item. */
const kindWhere = (kind?: 'direct' | 'deal'): Prisma.ConversationWhereInput => (kind === 'direct' ? { listingId: null } : kind === 'deal' ? { listingId: { not: null } } : {});

const notFound = () => new AppError('NOT_FOUND', 404, 'Conversation not found');

/**
 * Chat between a renter and an owner about one item (plan 9, spec §4.6): one conversation per item and
 * renter, plain text both ways, deal steps as system lines (deal-lines.ts), read marks and unread counts.
 * Only its two sides see a conversation; to anyone else it does not exist.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly activity: ActivityService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** The renter's conversation about a published item, started when there is none. */
  async open(userId: string, listingId: string): Promise<ConversationSummary> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, ownerId: true, status: true, demo: true } });
    if (!listing || listing.status !== 'PUBLISHED') throw new AppError('NOT_FOUND', 404, 'Listing not found');
    if (listing.demo) throw new AppError('DEMO_LISTING', 409);
    if (listing.ownerId === userId) {
      throw new AppError('ACTION_NOT_ALLOWED', 409, 'This is your own item', undefined, { why: 'OWN_LISTING' });
    }
    const now = this.clock.now();
    const row = await this.prisma.conversation.upsert({
      where: { listingId_renterId: { listingId, renterId: userId } },
      create: { listingId, renterId: userId, ownerId: listing.ownerId, lastMessageAt: now, createdAt: now },
      update: {},
      include: CONVERSATION_INCLUDE,
    });
    return this.summary(row, userId);
  }

  /**
   * A direct conversation with someone, from their profile (owner, 2026-11-16): one per pair, whoever
   * starts it. Only people with a public profile; not yourself.
   */
  async openDirect(userId: string, otherId: string): Promise<ConversationSummary> {
    if (otherId === userId) throw new AppError('ACTION_NOT_ALLOWED', 409, 'You cannot write to yourself', undefined, { why: 'SELF' });
    const other = await this.prisma.user.findUnique({ where: { id: otherId }, select: { blockedAt: true, deletedAt: true, role: true } });
    if (!other || other.blockedAt !== null || other.deletedAt !== null || other.role === 'ADMIN') throw new AppError('NOT_FOUND', 404, 'User not found');
    const directKey = [userId, otherId].sort().join(':');
    const now = this.clock.now();
    const row = await this.prisma.conversation.upsert({
      where: { directKey },
      create: { directKey, renterId: userId, ownerId: otherId, lastMessageAt: now, createdAt: now },
      update: {},
      include: CONVERSATION_INCLUDE,
    });
    return this.summary(row, userId);
  }

  async list(userId: string, kind?: 'direct' | 'deal'): Promise<ConversationList> {
    const rows = await this.prisma.conversation.findMany({
      where: { OR: [{ renterId: userId }, { ownerId: userId }], ...kindWhere(kind) },
      include: CONVERSATION_INCLUDE,
      orderBy: { lastMessageAt: 'desc' },
      take: LIST_LIMIT,
    });
    return { items: await Promise.all(rows.map((row) => this.summary(row, userId))) };
  }

  /** How many lines from the other side (and deal steps) I have not read, over all my conversations. */
  async unreadCount(userId: string, kind?: 'direct' | 'deal'): Promise<number> {
    const rows = await this.prisma.conversation.findMany({
      where: { OR: [{ renterId: userId }, { ownerId: userId }], ...kindWhere(kind) },
      select: { id: true, renterId: true, renterLastReadAt: true, ownerLastReadAt: true },
    });
    if (rows.length === 0) return 0;
    return this.prisma.message.count({
      where: {
        OR: rows.map((row) => ({
          conversationId: row.id,
          ...this.unseenBy(userId, row.renterId === userId ? row.renterLastReadAt : row.ownerLastReadAt),
        })),
      },
    });
  }

  /** The conversation of a deal, for its two sides (started when there is none): the deal page shows it. */
  async forDeal(userId: string, bookingId: string): Promise<ConversationSummary> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { listingId: true, renterId: true, ownerId: true } });
    if (!booking || (booking.renterId !== userId && booking.ownerId !== userId)) throw new AppError('NOT_FOUND', 404, 'Deal not found');
    const now = this.clock.now();
    const row = await this.prisma.conversation.upsert({
      where: { listingId_renterId: { listingId: booking.listingId, renterId: booking.renterId } },
      create: { listingId: booking.listingId, renterId: booking.renterId, ownerId: booking.ownerId, lastMessageAt: now, createdAt: now },
      update: {},
      include: CONVERSATION_INCLUDE,
    });
    return this.summary(row, userId);
  }

  async thread(userId: string, id: string, after?: Date): Promise<ConversationThread> {
    const row = await this.mine(userId, id);
    const messages = await this.prisma.message.findMany({
      where: { conversationId: id, ...(after && { createdAt: { gt: after } }) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: THREAD_LIMIT,
    });
    const deal = await this.dealOf(row);
    const asRenter = row.renterId === userId;
    const otherReadAt = asRenter ? row.ownerLastReadAt : row.renterLastReadAt;
    return {
      ...(await this.summary(row, userId)),
      messages: messages.reverse().map((m) => this.message(m, userId)),
      otherReadAt: otherReadAt?.toISOString() ?? null,
      dealId: deal?.id ?? null,
    };
  }

  async send(userId: string, id: string, text: string): Promise<ChatMessage> {
    const row = await this.mine(userId, id);
    const now = this.clock.now();
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { conversationId: id, authorId: userId, kind: 'TEXT', text, createdAt: now } }),
      this.prisma.conversation.update({ where: { id }, data: { lastMessageAt: now } }),
    ]);
    // That a message was sent, never its words.
    this.activity.record('MESSAGE_SENT', userId, { type: 'CONVERSATION', id });
    await this.ringTheOtherSide(row, userId);
    return this.message(message, userId);
  }

  /**
   * A deal's chat lives on the deal page, not in Messages (owner, 2026-11-16), so a line from the other side
   * rang nowhere: a new one lights the bell with "New message about …", leading to the deal's chat. One
   * notice per deal until it is read, however many lines follow.
   */
  private async ringTheOtherSide(row: ConversationRow, authorId: string): Promise<void> {
    const deal = await this.dealOf(row);
    if (!deal) return;
    const to = row.renterId === authorId ? row.ownerId : row.renterId;
    const waiting = await this.prisma.notification.count({
      where: { userId: to, kind: 'DEAL', event: 'MESSAGE', bookingId: deal.id, readAt: null },
    });
    if (waiting > 0) return;
    await this.notifications.notify([to], { kind: 'DEAL', event: 'MESSAGE', bookingId: deal.id, listingId: row.listingId, title: deal.title });
  }

  /** The latest deal of an item's conversation (its two sides and that item), or null for a direct one. */
  private async dealOf(row: ConversationRow): Promise<{ id: string; title: string } | null> {
    if (row.listingId === null) return null;
    const booking = await this.prisma.booking.findFirst({
      where: { listingId: row.listingId, renterId: row.renterId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, listing: { select: { title: true } } },
    });
    return booking ? { id: booking.id, title: booking.listing.title ?? '' } : null;
  }

  /** Marks everything in the conversation as read by me, now, and the bell's notice of its new lines. */
  async read(userId: string, id: string): Promise<void> {
    const row = await this.mine(userId, id);
    const now = this.clock.now();
    await this.prisma.conversation.update({
      where: { id },
      data: row.renterId === userId ? { renterLastReadAt: now } : { ownerLastReadAt: now },
    });
    const deal = await this.dealOf(row);
    if (deal) {
      await this.prisma.notification.updateMany({
        where: { userId, kind: 'DEAL', event: 'MESSAGE', bookingId: deal.id, readAt: null },
        data: { readAt: now },
      });
    }
  }

  /** A conversation I am a side of, or 404. */
  private async mine(userId: string, id: string): Promise<ConversationRow> {
    const row = await this.prisma.conversation.findUnique({ where: { id }, include: CONVERSATION_INCLUDE });
    if (!row || (row.renterId !== userId && row.ownerId !== userId)) throw notFound();
    return row;
  }

  /** Lines I did not write that came after my last read. */
  private unseenBy(userId: string, readAt: Date | null): Prisma.MessageWhereInput {
    return {
      OR: [{ authorId: null }, { authorId: { not: userId } }],
      ...(readAt && { createdAt: { gt: readAt } }),
    };
  }

  private async summary(row: ConversationRow, userId: string): Promise<ConversationSummary> {
    const role: ChatRole = row.renterId === userId ? 'RENTER' : 'OWNER';
    const other = role === 'RENTER' ? row.owner : row.renter;
    const readAt = role === 'RENTER' ? row.renterLastReadAt : row.ownerLastReadAt;
    const [last, unread] = await Promise.all([
      this.prisma.message.findFirst({ where: { conversationId: row.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      this.prisma.message.count({ where: { conversationId: row.id, ...this.unseenBy(userId, readAt) } }),
    ]);
    const cover = row.listing?.photos[0];
    return {
      id: row.id,
      role,
      listing: row.listing ? { id: row.listing.id, title: row.listing.title ?? '', photoUrl: cover ? this.storage.url(cover.storageKey, 'thumb') : null } : null,
      other: { id: other.id, name: publicName(other) },
      lastMessage: last ? this.message(last, userId) : null,
      lastMessageAt: row.lastMessageAt.toISOString(),
      unread,
    };
  }

  private message(m: Message, userId: string): ChatMessage {
    return {
      id: m.id,
      kind: m.kind,
      text: m.text,
      event: (m.event as SharedStatus | null) ?? null,
      bookingId: m.bookingId,
      mine: m.authorId === userId,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
