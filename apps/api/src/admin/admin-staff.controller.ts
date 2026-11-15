import { Body, Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffChangeSchema, StaffListSchema, type PublicUser, type StaffList } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuditService } from '../audit/audit.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard, Section } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { AppError } from '../common/app-error';
import { TwoFactorService } from '../auth/two-factor.service';
import { PrismaService } from '../prisma/prisma.service';

class StaffListDto extends createZodDto(StaffListSchema) {}
class StaffChangeDto extends createZodDto(StaffChangeSchema) {}

/**
 * Staff (owner only): who works in the admin panel and in which role. Nobody changes their own role,
 * and the last owner stays an owner. Every change goes to the audit log.
 */
@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Section('staff')
export class AdminStaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  @Get('staff')
  @ZodResponse({ status: 200, type: StaffListDto, description: 'Everyone who works in the admin panel, with their role' })
  @ApiErrors(401, 403)
  async list(): Promise<StaffList> {
    const rows = await this.prisma.user.findMany({ where: { role: 'ADMIN', deletedAt: null }, orderBy: { createdAt: 'asc' } });
    const seen = await this.prisma.refreshToken.groupBy({ by: ['userId'], where: { userId: { in: rows.map((r) => r.id) } }, _max: { createdAt: true } });
    const last = new Map(seen.map((s) => [s.userId, s._max.createdAt]));
    return {
      items: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        staffRole: u.staffRole ?? 'OWNER',
        twoFactor: u.totpEnabledAt !== null,
        lastSeenAt: last.get(u.id)?.toISOString() ?? null,
      })),
    };
  }

  @Put('users/:id/staff')
  @HttpCode(200)
  @ApiErrors(400, 401, 403, 404, 409)
  async change(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: StaffChangeDto): Promise<void> {
    if (id === admin.id) throw new AppError('ACTION_NOT_ALLOWED', 409, 'You cannot change your own role', undefined, { why: 'SELF' });
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt !== null) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (body.staffRole !== null && user.blockedAt !== null) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Unblock them first', undefined, { why: 'BLOCKED' });
    const wasOwner = user.role === 'ADMIN' && (user.staffRole ?? 'OWNER') === 'OWNER';
    if (wasOwner && body.staffRole !== 'OWNER') {
      const owners = await this.prisma.user.count({ where: { role: 'ADMIN', deletedAt: null, OR: [{ staffRole: 'OWNER' }, { staffRole: null }] } });
      if (owners <= 1) throw new AppError('ACTION_NOT_ALLOWED', 409, 'The last owner stays an owner', undefined, { why: 'LAST_OWNER' });
    }
    await this.prisma.user.update({
      where: { id },
      data: body.staffRole === null ? { role: 'USER', staffRole: null } : { role: 'ADMIN', staffRole: body.staffRole },
    });
    await this.audit.record(admin, {
      action: 'STAFF_CHANGED',
      targetType: 'USER',
      targetId: id,
      summary: user.email,
      before: { role: user.role, staffRole: user.role === 'ADMIN' ? (user.staffRole ?? 'OWNER') : null },
      after: { staffRole: body.staffRole },
    });
  }

  /** Someone lost their phone: turn their two-step sign-in off so they can set it up again. */
  @Delete('users/:id/two-factor')
  @HttpCode(204)
  @ApiErrors(401, 403, 404)
  async resetTwoFactor(@CurrentUser() admin: PublicUser, @Param('id') id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt !== null) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (!this.twoFactor.enabled(user)) return;
    await this.twoFactor.clear(id);
    await this.audit.record(admin, { action: 'TWO_FACTOR_RESET', targetType: 'USER', targetId: id, summary: user.email });
  }
}
