import { Inject, Injectable, Logger } from '@nestjs/common';
import { ADMIN_AUDIT_PAGE_SIZE, type AdminAuditList, type AuditAction } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditRecord {
  action: AuditAction;
  targetType: 'LISTING' | 'USER' | 'BOOKING' | 'REPORT' | 'REVIEW' | 'SETTINGS' | 'CATEGORY' | 'IDENTITY';
  targetId?: string | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
}

/**
 * The admin audit log (spec §6): every administrator action, attributed, with the state before and after.
 * Writing never fails the action it records (logged instead).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async record(admin: { id: string; name: string }, entry: AuditRecord): Promise<void> {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          adminName: admin.name,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId ?? null,
          summary: (entry.summary ?? '').slice(0, 300),
          ...(entry.before !== undefined && { before: entry.before as Prisma.InputJsonValue }),
          ...(entry.after !== undefined && { after: entry.after as Prisma.InputJsonValue }),
          createdAt: this.clock.now(),
        },
      });
    } catch (error) {
      this.logger.error(`audit ${entry.action} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async list(query: { action?: AuditAction; targetId?: string; page: number }): Promise<AdminAuditList> {
    const where: Prisma.AdminAuditLogWhereInput = { ...(query.action && { action: query.action }), ...(query.targetId && { targetId: query.targetId }) };
    const [rows, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * ADMIN_AUDIT_PAGE_SIZE,
        take: ADMIN_AUDIT_PAGE_SIZE,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        admin: { id: r.adminId, name: r.adminName },
        action: r.action as AuditAction,
        targetType: r.targetType,
        targetId: r.targetId,
        summary: r.summary,
        before: r.before ?? null,
        after: r.after ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
