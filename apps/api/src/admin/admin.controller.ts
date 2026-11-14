import { Controller, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ADMIN_USERS_PAGE_SIZE,
  AdminUsersQuerySchema,
  AdminUserResponseSchema,
  AdminUsersResponseSchema,
  type AdminUser,
  type AdminUserResponse,
  type AdminUsersResponse,
  type PublicUser,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { toPublicUser } from '../auth/public-user';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { AppError } from '../common/app-error';
import { CLOCK, type Clock } from '../clock/clock';
import type { Prisma, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

class AdminUsersQueryDto extends createZodDto(AdminUsersQuerySchema) {}
class AdminUsersResponseDto extends createZodDto(AdminUsersResponseSchema) {}
class AdminUserResponseDto extends createZodDto(AdminUserResponseSchema) {}

function toAdminUser(user: User): AdminUser {
  return {
    ...toPublicUser(user),
    blockedAt: user.blockedAt?.toISOString() ?? null,
    deletedAt: user.deletedAt?.toISOString() ?? null,
  };
}

/** The base of the admin panel (plan 9). Administrators only. */
@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get('users')
  @ZodResponse({ status: 200, type: AdminUsersResponseDto, description: `Users, newest first, ${ADMIN_USERS_PAGE_SIZE} a page` })
  @ApiErrors(400, 401, 403)
  async users(@Query() query: AdminUsersQueryDto): Promise<AdminUsersResponse> {
    const search = query.search || undefined;
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const page = query.page ?? 1;
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * ADMIN_USERS_PAGE_SIZE,
        take: ADMIN_USERS_PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: rows.map(toAdminUser), total };
  }

  /**
   * Blocks an account at once: every request with its tokens is refused (AUTH_BLOCKED) and its
   * sessions end; its listings leave the catalog. Administrators, and oneself, cannot be blocked.
   */
  @Post('users/:id/block')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AdminUserResponseDto, description: 'The account is blocked and signed out everywhere' })
  @ApiErrors(401, 403, 404, 409)
  async block(@CurrentUser() admin: PublicUser, @Param('id') id: string): Promise<AdminUserResponse> {
    const user = await this.target(id);
    if (user.id === admin.id || user.role === 'ADMIN') {
      throw new AppError('ACTION_NOT_ALLOWED', 409, 'Administrators cannot be blocked', undefined, { why: 'ADMIN' });
    }
    const now = this.clock.now();
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { blockedAt: user.blockedAt ?? now } }),
      this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    return { user: toAdminUser(updated) };
  }

  @Post('users/:id/unblock')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AdminUserResponseDto, description: 'The account may sign in again' })
  @ApiErrors(401, 403, 404)
  async unblock(@Param('id') id: string): Promise<AdminUserResponse> {
    await this.target(id);
    return { user: toAdminUser(await this.prisma.user.update({ where: { id }, data: { blockedAt: null } })) };
  }

  private async target(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt !== null) throw new AppError('NOT_FOUND', 404, 'User not found');
    return user;
  }
}
