import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/**
 * Everything Yoyo holds about a person, as one machine-readable JSON document (GDPR art. 15 access and
 * art. 20 portability; privacy policy §9). Their own data in full; about other people only what the
 * deal page already shows them (names), never contact details. No secrets: no password or token hashes,
 * no card or payout tokens, no provider references. Reviews about them only once public (blind rule).
 */
@Injectable()
export class DataExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async export(userId: string): Promise<Record<string, unknown>> {
    const now = this.clock.now();
    const [user, oauth, sessions, listings, deals, written, favorites, payments, payouts, wallet, entries, conversations] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.oAuthAccount.findMany({ where: { userId }, select: { provider: true, createdAt: true } }),
      this.prisma.refreshToken.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: now } },
        select: { createdAt: true, expiresAt: true, userAgent: true, ip: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listing.findMany({ where: { ownerId: userId }, include: { photos: true, unavailability: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.booking.findMany({
        where: { OR: [{ renterId: userId }, { ownerId: userId }] },
        include: { listing: { select: { id: true, title: true } }, renter: { select: { name: true } }, owner: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.review.findMany({ where: { authorId: userId }, include: { listing: { select: { title: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.favorite.findMany({ where: { userId }, include: { listing: { select: { id: true, title: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.payout.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.ledgerAccount.findUnique({ where: { id: `wallet:${userId}` } }),
      this.prisma.ledgerEntry.findMany({ where: { account: `wallet:${userId}` }, include: { operation: true }, orderBy: { id: 'asc' } }),
      this.prisma.conversation.findMany({
        where: { OR: [{ renterId: userId }, { ownerId: userId }] },
        include: {
          listing: { select: { title: true } },
          renter: { select: { name: true } },
          owner: { select: { name: true } },
          messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { author: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Reviews about them: every public page (the blind rule decides what is public).
    const received = [];
    for (let page = 1; ; page++) {
      const result = await this.reviews.forUser(userId, page);
      received.push(...result.items);
      if (page * result.pageSize >= result.total) break;
    }

    return {
      exportedAt: now.toISOString(),
      about:
        'Everything Yoyo (yoyo.rent) holds about you. Amounts are in euro cents; times are UTC. Questions: admin@yoyo.rent.',
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerifiedAt: iso(user.emailVerifiedAt),
        phone: user.phone,
        phoneVerifiedAt: iso(user.phoneVerifiedAt),
        city: user.city,
        about: user.about,
        language: user.locale,
        theme: user.theme,
        role: user.role,
        createdAt: iso(user.createdAt),
        blockedAt: iso(user.blockedAt),
        blockedReason: user.blockedReason,
      },
      signInMethods: [...(user.passwordHash ? ['password'] : []), ...oauth.map((o) => o.provider)],
      sessions: sessions.map((s) => ({ startedAt: iso(s.createdAt), expiresAt: iso(s.expiresAt), device: s.userAgent, ipAddress: s.ip })),
      listings: listings.map((l) => ({
        id: l.id,
        status: l.status,
        title: l.title,
        description: l.description,
        categoryId: l.categoryId,
        condition: l.condition,
        attributes: l.attributes,
        language: l.contentLocale,
        dailyCents: l.dailyCents,
        weeklyDiscountPercent: l.weeklyDiscountPercent,
        depositCents: l.depositCents,
        minDays: l.minDays,
        maxDays: l.maxDays,
        city: l.city,
        district: l.district,
        lat: l.lat,
        lng: l.lng,
        rules: l.rules,
        rejectionReason: l.rejectionReason,
        photos: l.photos.map((p) => ({ id: p.id, position: p.position, width: p.width, height: p.height })),
        closedDays: l.unavailability.map((u) => ({ from: u.start, to: u.end })),
        createdAt: iso(l.createdAt),
        publishedAt: iso(l.publishedAt),
      })),
      deals: deals.map((b) => ({
        id: b.id,
        role: b.renterId === userId ? 'RENTER' : 'OWNER',
        status: b.status,
        outcome: b.outcome,
        listing: { id: b.listing.id, title: b.listing.title },
        otherSide: b.renterId === userId ? b.owner.name : b.renter.name,
        start: b.start,
        end: b.end,
        rentCents: b.rentCents,
        serviceFeeCents: b.serviceFeeCents,
        depositCents: b.depositCents,
        totalCents: b.totalCents,
        message: b.message,
        createdAt: iso(b.createdAt),
        completedAt: iso(b.completedAt),
        cancelledAt: iso(b.cancelledAt),
        cancelReason: b.cancelReason,
        damageDescription: b.damageDescription,
        disputeNote: b.disputeNote,
        resolutionComment: b.resolutionComment,
      })),
      reviewsWritten: written.map((r) => ({
        deal: r.bookingId,
        listing: r.listing?.title ?? null,
        asRole: r.authorRole,
        rating: r.rating,
        itemRating: r.itemRating,
        text: r.text,
        createdAt: iso(r.createdAt),
      })),
      reviewsAboutYou: received.map((r) => ({
        author: r.author.name,
        authorRole: r.authorRole,
        rating: r.rating,
        text: r.text,
        listing: r.listing?.title ?? null,
        createdAt: r.createdAt,
      })),
      // The talks they took part in, both sides' lines: what they saw in the chat.
      conversations: conversations.map((c) => {
        const asRenter = c.renterId === userId;
        return {
          item: c.listing.title ?? '',
          role: asRenter ? 'RENTER' : 'OWNER',
          with: asRenter ? c.owner.name : c.renter.name,
          startedAt: iso(c.createdAt),
          messages: c.messages.map((m) =>
            m.kind === 'SYSTEM'
              ? { from: 'Yoyo', dealStep: m.event, deal: m.bookingId, at: iso(m.createdAt) }
              : { from: m.authorId === userId ? 'me' : (m.author?.name ?? ''), text: m.text, at: iso(m.createdAt) },
          ),
        };
      }),
      favourites: favorites.map((f) => ({ listing: f.listing.id, title: f.listing.title, addedAt: iso(f.createdAt) })),
      wallet: {
        balanceCents: wallet?.balance ?? 0,
        history: entries.map((e) => ({
          kind: e.operation.kind,
          amountCents: e.amount,
          deal: e.operation.bookingId,
          at: iso(e.operation.createdAt),
        })),
        cardPayments: payments.map((p) => ({
          purpose: p.purpose,
          amountCents: p.amountCents,
          refundedCents: p.refundedCents,
          card: p.brand,
          deal: p.bookingId,
          at: iso(p.createdAt),
        })),
        payouts: payouts.map((p) => ({ amountCents: p.amountCents, card: p.brand, status: p.status, at: iso(p.createdAt), doneAt: iso(p.doneAt) })),
      },
    };
  }
}
