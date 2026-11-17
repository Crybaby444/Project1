import { Inject, Injectable } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { ADMIN_REPORTS_PAGE_SIZE, type AdminReport, type AdminReportList, type CloseReport, type ReportRequest, type ReportStatus } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Report } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const notFound = () => new AppError('NOT_FOUND', 404, 'Nothing to report here');

/**
 * Complaints (spec §5): anyone signed in reports an item, a person or a message they took part in; an
 * administrator works through the queue and closes each with a note. One open complaint per reporter
 * and target; nobody reports themselves or their own item.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly activity: ActivityService,
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(reporterId: string, request: ReportRequest): Promise<void> {
    const ids = await this.targetIds(reporterId, request);
    const open = await this.prisma.report.findFirst({ where: { reporterId, target: request.target, ...ids, status: 'OPEN' }, select: { id: true } });
    if (open) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Already reported', undefined, { why: 'ALREADY_REPORTED' });
    const report = await this.prisma.report.create({
      data: { reporterId, target: request.target, ...ids, reason: request.reason, note: request.note, createdAt: this.clock.now() },
    });
    this.activity.record('REPORT_FILED', reporterId, { type: 'REPORT', id: report.id }, `${request.target} · ${request.reason}`);
  }

  /** The target's ids, after checking it exists and may be reported by this person. */
  private async targetIds(reporterId: string, request: ReportRequest): Promise<{ listingId?: string; userId?: string; messageId?: string }> {
    const own = () => new AppError('ACTION_NOT_ALLOWED', 409, 'This is yours', undefined, { why: 'OWN' });
    if (request.target === 'LISTING') {
      const listing = await this.prisma.listing.findUnique({ where: { id: request.id }, select: { ownerId: true, status: true } });
      if (!listing || listing.status === 'DRAFT') throw notFound();
      if (listing.ownerId === reporterId) throw own();
      return { listingId: request.id, userId: listing.ownerId };
    }
    if (request.target === 'USER') {
      const user = await this.prisma.user.findUnique({ where: { id: request.id }, select: { id: true, deletedAt: true } });
      if (!user || user.deletedAt !== null) throw notFound();
      if (user.id === reporterId) throw own();
      return { userId: user.id };
    }
    const message = await this.prisma.message.findUnique({
      where: { id: request.id },
      select: { authorId: true, conversation: { select: { renterId: true, ownerId: true } } },
    });
    if (!message || message.authorId === null) throw notFound();
    const { renterId, ownerId } = message.conversation;
    if (reporterId !== renterId && reporterId !== ownerId) throw notFound();
    if (message.authorId === reporterId) throw own();
    return { messageId: request.id, userId: message.authorId };
  }

  async openCount(): Promise<number> {
    return this.prisma.report.count({ where: { status: 'OPEN' } });
  }

  async list(status: ReportStatus, page: number): Promise<AdminReportList> {
    const where = { status };
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: { reporter: { select: { id: true, name: true } } },
        orderBy: status === 'OPEN' ? { createdAt: 'asc' } : { resolvedAt: 'desc' },
        skip: (page - 1) * ADMIN_REPORTS_PAGE_SIZE,
        take: ADMIN_REPORTS_PAGE_SIZE,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items: await Promise.all(rows.map((row) => this.view(row))), total };
  }

  async close(adminId: string, id: string, verdict: CloseReport): Promise<AdminReport> {
    const done = await this.prisma.report.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: verdict.status, resolution: verdict.resolution, resolvedById: adminId, resolvedAt: this.clock.now() },
    });
    if (done.count === 0) {
      const exists = await this.prisma.report.count({ where: { id } });
      throw exists ? new AppError('ACTION_NOT_ALLOWED', 409, 'Already closed', undefined, { why: 'CLOSED' }) : new AppError('NOT_FOUND', 404, 'Report not found');
    }
    const row = await this.prisma.report.findUniqueOrThrow({ where: { id }, include: { reporter: { select: { id: true, name: true } } } });
    return this.view(row);
  }

  private async view(row: Report & { reporter: { id: string; name: string } }): Promise<AdminReport> {
    let subject: AdminReport['subject'];
    if (row.target === 'LISTING' && row.listingId) {
      const l = await this.prisma.listing.findUnique({ where: { id: row.listingId }, select: { title: true, ownerId: true } });
      subject = { id: row.listingId, label: l?.title ?? '—', userId: l?.ownerId ?? null };
    } else if (row.target === 'MESSAGE' && row.messageId) {
      const m = await this.prisma.message.findUnique({ where: { id: row.messageId }, select: { text: true, authorId: true } });
      subject = { id: row.messageId, label: m?.text ?? '—', userId: m?.authorId ?? null };
    } else {
      const u = row.userId ? await this.prisma.user.findUnique({ where: { id: row.userId }, select: { name: true } }) : null;
      subject = { id: row.userId ?? '', label: u?.name ?? '—', userId: row.userId };
    }
    return {
      id: row.id,
      target: row.target,
      reason: row.reason,
      note: row.note,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      reporter: row.reporter,
      subject,
      resolution: row.resolution,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    };
  }
}
