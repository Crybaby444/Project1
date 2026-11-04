import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ADMIN_USERS_PAGE_SIZE,
  AdminUsersQuerySchema,
  AdminUsersResponseSchema,
  type AdminUser,
  type AdminUsersResponse,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { toPublicUser } from '../auth/public-user';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import type { Prisma, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

class AdminUsersQueryDto extends createZodDto(AdminUsersQuerySchema) {}
class AdminUsersResponseDto extends createZodDto(AdminUsersResponseSchema) {}

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
  constructor(private readonly prisma: PrismaService) {}

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
}
