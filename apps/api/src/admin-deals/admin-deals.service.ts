import { Injectable } from '@nestjs/common';
import {
  ADMIN_PAGE_SIZE,
  type AdminAccountsResponse,
  type AdminBookingDetail,
  type AdminBookingsResponse,
  type AdminLedgerResponse,
  type BookingStatus,
  type LedgerKind,
  type LedgerOperationView,
  type LedgerSummary,
  type PublicUser,
} from '@yoyo/shared';
import type { LedgerEntry, LedgerOperation, Prisma } from '../generated/prisma/client';
import { BookingPhotosService } from '../bookings/booking-photos.service';
import { BOOKING_INCLUDE } from '../bookings/booking.serializer';
import { bookingNotFound } from '../bookings/booking-errors';
import { BookingsService } from '../bookings/bookings.service';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';

function operationView(op: LedgerOperation & { entries: LedgerEntry[] }): LedgerOperationView {
  return {
    id: op.id,
    kind: op.kind,
    bookingId: op.bookingId,
    userId: op.userId,
    createdAt: op.createdAt.toISOString(),
    postings: [...op.entries].sort((a, b) => (a.id < b.id ? -1 : 1)).map((e) => ({ account: e.account, amount: e.amount })),
  };
}

/** What administrators read about deals and money (plan 8, Task 11); the panel itself is plan 11. */
@Injectable()
export class AdminDealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly photos: BookingPhotosService,
    private readonly ledger: LedgerService,
  ) {}

  async list(admin: PublicUser, query: { status?: BookingStatus; disputed?: 'true' | 'false'; page?: number }): Promise<AdminBookingsResponse> {
    const disputed = query.disputed === 'true';
    const where: Prisma.BookingWhereInput = disputed ? { status: 'DISPUTED' } : query.status ? { status: query.status } : {};
    const page = query.page ?? 1;
    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        // Disputes: the longest waiting first. Everything else: the latest change first.
        orderBy: disputed ? [{ disputeOpenedAt: 'asc' }, { id: 'asc' }] : [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
      }),
      this.prisma.booking.count({ where }),
    ]);
    const items = [];
    for (const row of rows) items.push(await this.bookings.serialize(row, { kind: 'ADMIN', userId: admin.id }));
    return { items, total };
  }

  async detail(admin: PublicUser, id: string): Promise<AdminBookingDetail> {
    const row = await this.prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!row) throw bookingNotFound();
    const [events, operations, payments, photos] = await Promise.all([
      this.prisma.bookingEvent.findMany({ where: { bookingId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.prisma.ledgerOperation.findMany({ where: { bookingId: id }, include: { entries: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.prisma.payment.findMany({ where: { bookingId: id }, include: { refunds: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'asc' } }),
      this.photos.list(id, admin),
    ]);
    return {
      booking: await this.bookings.serialize(row, { kind: 'ADMIN', userId: admin.id }),
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        actorKind: e.actorKind,
        actorId: e.actorId,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        data: e.data as Record<string, unknown>,
        messages: e.messages,
        createdAt: e.createdAt.toISOString(),
      })),
      operations: operations.map(operationView),
      photos,
      payments: payments.map((p) => ({
        id: p.id,
        amountCents: p.amountCents,
        refundedCents: p.refundedCents,
        brand: p.brand,
        last4: p.last4,
        createdAt: p.createdAt.toISOString(),
        refunds: p.refunds.map((r) => ({ id: r.id, amountCents: r.amountCents, status: r.status, createdAt: r.createdAt.toISOString() })),
      })),
    };
  }

  async operations(query: { bookingId?: string; account?: string; kind?: LedgerKind; page?: number }): Promise<AdminLedgerResponse> {
    const where: Prisma.LedgerOperationWhereInput = {
      ...(query.bookingId && { bookingId: query.bookingId }),
      ...(query.kind && { kind: query.kind }),
      ...(query.account && { entries: { some: { account: query.account } } }),
    };
    const page = query.page ?? 1;
    const [rows, total] = await Promise.all([
      this.prisma.ledgerOperation.findMany({
        where,
        include: { entries: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
      }),
      this.prisma.ledgerOperation.count({ where }),
    ]);
    return { items: rows.map(operationView), total };
  }

  async accounts(query: { prefix?: string; page?: number }): Promise<AdminAccountsResponse> {
    const where: Prisma.LedgerAccountWhereInput = query.prefix ? { id: { startsWith: query.prefix } } : {};
    const page = query.page ?? 1;
    const [rows, total] = await Promise.all([
      this.prisma.ledgerAccount.findMany({ where, orderBy: { id: 'asc' }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
      this.prisma.ledgerAccount.count({ where }),
    ]);
    return { items: rows.map((r) => ({ id: r.id, balance: r.balance })), total };
  }

  async summary(): Promise<LedgerSummary> {
    const [row] = await this.prisma.$queryRaw<{ revenue: bigint; escrow: bigint; deposits: bigint; wallets: bigint; external: bigint }[]>`
      SELECT
        COALESCE(SUM(balance) FILTER (WHERE id = 'platform:revenue'), 0) AS revenue,
        COALESCE(SUM(balance) FILTER (WHERE id LIKE 'escrow:%'), 0) AS escrow,
        COALESCE(SUM(balance) FILTER (WHERE id LIKE 'deposit:%'), 0) AS deposits,
        COALESCE(SUM(balance) FILTER (WHERE id LIKE 'wallet:%'), 0) AS wallets,
        COALESCE(SUM(balance) FILTER (WHERE id = 'external:card'), 0) AS external
      FROM "LedgerAccount"`;
    return {
      revenueCents: Number(row?.revenue ?? 0),
      escrowCents: Number(row?.escrow ?? 0),
      depositsCents: Number(row?.deposits ?? 0),
      walletsCents: Number(row?.wallets ?? 0),
      externalCents: Number(row?.external ?? 0),
      audit: await this.ledger.audit(),
    };
  }
}
