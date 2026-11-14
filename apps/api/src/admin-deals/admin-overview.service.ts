import { Inject, Injectable } from '@nestjs/common';
import { CLOSED_BOOKING_STATUSES, type AdminActivity, type AdminOverview } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { PrismaService } from '../prisma/prisma.service';
import { AdminDealsService } from './admin-deals.service';

const DAY = 86_400_000;
const SERIES_DAYS = 14;
const ACTIVITY = 14;

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

/** The admin panel's first screen (AdminOverviewSchema): counts, money, the last 14 days and the feed. */
@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deals: AdminDealsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async overview(): Promise<AdminOverview> {
    const now = this.clock.now();
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const monthAgo = new Date(now.getTime() - 30 * DAY);
    const seriesFrom = new Date(`${utcDay(new Date(now.getTime() - (SERIES_DAYS - 1) * DAY))}T00:00:00.000Z`);
    const p = this.prisma;
    const [
      usersTotal, usersNew, usersBlocked, pending, published, listingsTotal,
      open, requested, disputed, completed, turnover, ledger, newUsers, newDeals, activity,
    ] = await Promise.all([
      p.user.count({ where: { deletedAt: null } }),
      p.user.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
      p.user.count({ where: { deletedAt: null, blockedAt: { not: null } } }),
      p.listing.count({ where: { status: 'PENDING_REVIEW' } }),
      p.listing.count({ where: { status: 'PUBLISHED' } }),
      p.listing.count({ where: { status: { not: 'ARCHIVED' } } }),
      p.booking.count({ where: { status: { notIn: [...CLOSED_BOOKING_STATUSES] } } }),
      p.booking.count({ where: { status: 'REQUESTED' } }),
      p.booking.count({ where: { status: 'DISPUTED' } }),
      p.booking.count({ where: { status: 'COMPLETED', completedAt: { gte: monthAgo } } }),
      p.booking.aggregate({ _sum: { totalCents: true }, where: { status: 'COMPLETED', completedAt: { gte: monthAgo } } }),
      this.deals.summary(),
      p.user.findMany({ where: { createdAt: { gte: seriesFrom } }, select: { createdAt: true } }),
      p.booking.findMany({ where: { createdAt: { gte: seriesFrom } }, select: { createdAt: true } }),
      this.activity(),
    ]);

    const series = Array.from({ length: SERIES_DAYS }, (_, i) => ({
      day: utcDay(new Date(seriesFrom.getTime() + i * DAY)),
      users: 0,
      deals: 0,
    }));
    const slot = new Map(series.map((s) => [s.day, s]));
    for (const u of newUsers) {
      const s = slot.get(utcDay(u.createdAt));
      if (s) s.users++;
    }
    for (const b of newDeals) {
      const s = slot.get(utcDay(b.createdAt));
      if (s) s.deals++;
    }

    const audit = ledger.audit;
    return {
      users: { total: usersTotal, new7d: usersNew, blocked: usersBlocked },
      listings: { pendingReview: pending, published, total: listingsTotal },
      deals: { open, requested, disputed, completed30d: completed },
      money: {
        turnover30dCents: turnover._sum.totalCents ?? 0,
        revenueCents: ledger.revenueCents,
        escrowCents: ledger.escrowCents,
        depositsCents: ledger.depositsCents,
        walletsCents: ledger.walletsCents,
      },
      ledgerOk: audit.sumOfAll === 0 && audit.mismatched.length === 0 && audit.unbalancedOperations.length === 0 && audit.negative.length === 0,
      series,
      activity,
    };
  }

  /** The newest of each kind of event, merged and cut to the feed's length. */
  private async activity(): Promise<AdminActivity[]> {
    const p = this.prisma;
    const [users, listings, deals, disputes] = await Promise.all([
      p.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: ACTIVITY, select: { id: true, name: true, email: true, createdAt: true } }),
      p.listing.findMany({
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: 'desc' },
        take: ACTIVITY,
        select: { id: true, title: true, submittedAt: true, owner: { select: { name: true } } },
      }),
      p.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: ACTIVITY,
        select: { id: true, createdAt: true, listing: { select: { title: true } }, renter: { select: { name: true } } },
      }),
      p.booking.findMany({
        where: { disputeOpenedAt: { not: null } },
        orderBy: { disputeOpenedAt: 'desc' },
        take: ACTIVITY,
        select: { id: true, disputeOpenedAt: true, listing: { select: { title: true } }, owner: { select: { name: true } } },
      }),
    ]);
    const all: AdminActivity[] = [
      ...users.map((u) => ({ kind: 'USER_JOINED' as const, at: u.createdAt.toISOString(), id: u.id, title: u.email, who: u.name })),
      ...listings.map((l) => ({ kind: 'LISTING_SUBMITTED' as const, at: l.submittedAt!.toISOString(), id: l.id, title: l.title ?? '', who: l.owner.name })),
      ...deals.map((b) => ({ kind: 'DEAL_REQUESTED' as const, at: b.createdAt.toISOString(), id: b.id, title: b.listing.title ?? '', who: b.renter.name })),
      ...disputes.map((b) => ({ kind: 'DISPUTE_OPENED' as const, at: b.disputeOpenedAt!.toISOString(), id: b.id, title: b.listing.title ?? '', who: b.owner.name })),
    ];
    return all.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, ACTIVITY);
  }
}
