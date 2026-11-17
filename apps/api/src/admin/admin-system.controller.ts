import { Controller, Delete, Get, HttpCode, Inject, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ServerErrorListSchema, type ServerErrorList } from '@yoyo/shared';
import { createZodDto as errorsDto } from 'nestjs-zod';
import { ErrorLogService } from '../common/error-log.service';
import { ApiTags } from '@nestjs/swagger';
import { ADMIN_EXPORTS, AdminSystemSchema, type AdminExport, type AdminSystem, type PublicUser, AdminDemoSchema, type AdminDemo } from '@yoyo/shared';
import type { Response } from 'express';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuditService } from '../audit/audit.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DemoListingsService } from '../demo/demo-listings.service';
import { Roles, RolesGuard, Section } from '../auth/roles.guard';
import { CLOCK, type Clock } from '../clock/clock';
import { ApiErrors } from '../common/api-errors';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { API_VERSION } from '../version';

class AdminSystemDto extends createZodDto(AdminSystemSchema) {}

const STARTED = Date.now();

/** One CSV cell: quoted when needed, and never read as a formula by a spreadsheet (CSV injection). */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const csv = (head: string[], rows: unknown[][]) => [head.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n') + '\n';

/** Admin → System: health, limits and CSV exports of people, items, deals and the ledger. */
class ServerErrorListDto extends errorsDto(ServerErrorListSchema) {}
class AdminDemoDto extends createZodDto(AdminDemoSchema) {}

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Section('system')
export class AdminSystemController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly errors: ErrorLogService,
    private readonly demo: DemoListingsService,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'STORAGE' | 'PAYMENTS'>,
  ) {}

  /** The last unexpected server errors (counted when they repeat), newest first. */
  @Get('system/errors')
  @ZodResponse({ status: 200, type: ServerErrorListDto, description: 'Recent unexpected server errors' })
  @ApiErrors(401, 403)
  serverErrors(): Promise<ServerErrorList> {
    return this.errors.recent();
  }

  /** How many example listings are on the site (owner, 2026-11-16). */
  @Get('system/demo')
  @ZodResponse({ status: 200, type: AdminDemoDto, description: 'How many example listings are on the site' })
  @ApiErrors(401, 403)
  demoStatus(): Promise<AdminDemo> {
    return this.demo.status();
  }

  /** Puts the 24 example listings for Latvia on the site (skips those already there); audited. */
  @Post('system/demo')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AdminDemoDto, description: 'Up to six more examples added' })
  @ApiErrors(401, 403, 503)
  async addDemo(@CurrentUser() admin: PublicUser): Promise<AdminDemo> {
    const added = await this.demo.add();
    await this.audit.record(admin, { action: 'SETTINGS_CHANGED', targetType: 'SETTINGS', summary: `example listings added: ${added}` });
    return { ...(await this.demo.status()), added };
  }

  /** Takes every example listing off the site, with its photos; audited. */
  @Delete('system/demo')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AdminDemoDto, description: 'Every example removed' })
  @ApiErrors(401, 403)
  async removeDemo(@CurrentUser() admin: PublicUser): Promise<AdminDemo> {
    const removed = await this.demo.remove();
    await this.audit.record(admin, { action: 'SETTINGS_CHANGED', targetType: 'SETTINGS', summary: `example listings removed: ${removed}` });
    return { count: 0, total: (await this.demo.status()).total, removed };
  }

  @Get('system')
  @ZodResponse({ status: 200, type: AdminSystemDto, description: 'Is everything running, and how close to the limits' })
  @ApiErrors(401, 403)
  async system(): Promise<AdminSystem> {
    const started = Date.now();
    let ok = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      ok = false;
    }
    const latencyMs = Date.now() - started;
    const now = this.clock.now();
    const [overdueTimers, users, listings, bookings, messages, reviews] = await Promise.all([
      this.prisma.booking.count({ where: { timerKind: { not: null }, timerDueAt: { lt: new Date(now.getTime() - 15 * 60_000) } } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.listing.count({ where: { status: { not: 'ARCHIVED' } } }),
      this.prisma.booking.count(),
      this.prisma.message.count(),
      this.prisma.review.count(),
    ]);
    return {
      version: API_VERSION,
      uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
      database: { ok, latencyMs },
      mail: this.mail.budget(),
      overdueTimers,
      storage: String(this.env.STORAGE ?? 'none'),
      payments: String(this.env.PAYMENTS ?? 'none'),
      counts: { users, listings, bookings, messages, reviews },
    };
  }

  @Get('export/:file')
  @ApiErrors(401, 403, 404)
  async export(@Param('file') file: string, @Res({ passthrough: true }) res: Response): Promise<string> {
    const kind = file.replace(/\.csv$/, '') as AdminExport;
    if (!file.endsWith('.csv') || !(ADMIN_EXPORTS as readonly string[]).includes(kind)) throw new AppError('NOT_FOUND', 404, 'No such export');
    const day = this.clock.now().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="yoyo-${kind}-${day}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    return this.build(kind);
  }

  private async build(kind: AdminExport): Promise<string> {
    const p = this.prisma;
    switch (kind) {
      case 'users': {
        const rows = await p.user.findMany({ orderBy: { createdAt: 'asc' } });
        return csv(
          ['id', 'name', 'email', 'role', 'status', 'email_verified', 'created_at'],
          rows.map((u) => [u.id, u.name, u.email, u.role, u.deletedAt ? 'deleted' : u.blockedAt ? 'blocked' : 'active', u.emailVerifiedAt ? 'yes' : 'no', u.createdAt]),
        );
      }
      case 'listings': {
        const rows = await p.listing.findMany({ orderBy: { createdAt: 'asc' }, include: { owner: { select: { email: true } } } });
        return csv(
          ['id', 'title', 'status', 'owner_email', 'daily_eur', 'deposit_eur', 'city', 'district', 'created_at', 'published_at'],
          rows.map((l) => [l.id, l.title, l.status, l.owner.email, l.dailyCents === null ? '' : (l.dailyCents / 100).toFixed(2), (l.depositCents / 100).toFixed(2), l.city, l.district, l.createdAt, l.publishedAt]),
        );
      }
      case 'deals': {
        const rows = await p.booking.findMany({
          orderBy: { createdAt: 'asc' },
          include: { listing: { select: { title: true } }, renter: { select: { email: true } }, owner: { select: { email: true } } },
        });
        return csv(
          ['id', 'item', 'status', 'renter_email', 'owner_email', 'start', 'end', 'rent_eur', 'fee_eur', 'deposit_eur', 'total_eur', 'created_at', 'completed_at'],
          rows.map((b) => [
            b.id, b.listing.title, b.status, b.renter.email, b.owner.email, b.start.toISOString().slice(0, 10), b.end.toISOString().slice(0, 10),
            (b.rentCents / 100).toFixed(2), (b.serviceFeeCents / 100).toFixed(2), (b.depositCents / 100).toFixed(2), (b.totalCents / 100).toFixed(2), b.createdAt, b.completedAt,
          ]),
        );
      }
      case 'ledger': {
        const rows = await p.ledgerEntry.findMany({ orderBy: { id: 'asc' }, include: { operation: true } });
        return csv(
          ['operation', 'kind', 'deal', 'account', 'amount_eur', 'at'],
          rows.map((e) => [e.operationId, e.operation.kind, e.operation.bookingId, e.account, (e.amount / 100).toFixed(2), e.operation.createdAt]),
        );
      }
    }
  }
}
