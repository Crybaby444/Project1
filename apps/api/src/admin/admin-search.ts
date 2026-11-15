import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminSearchSchema, type AdminSearch } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard, Section } from '../auth/roles.guard';
import { escapeLike } from '../catalog/catalog-query';
import { ApiErrors } from '../common/api-errors';
import { PrismaService } from '../prisma/prisma.service';

class AdminSearchDto extends createZodDto(AdminSearchSchema) {}
class AdminSearchQueryDto extends createZodDto(z.object({ q: z.string().trim().min(2).max(100) })) {}

const LIMIT = 6;

/**
 * The admin panel's search (⌘K): people by name or email, items by title, deals by id or their item's
 * title; letter case and diacritics do not matter ("kalnina" finds "Kalniņa").
 */
@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Section('overview')
  @Get('search')
  @ZodResponse({ status: 200, type: AdminSearchDto, description: 'People, items and deals matching the words, an email or an id' })
  @ApiErrors(400, 401, 403)
  async search(@Query() query: AdminSearchQueryDto): Promise<AdminSearch> {
    const like = `%${escapeLike(query.q)}%`;
    const idPrefix = `${escapeLike(query.q)}%`;
    const [users, listings, deals] = await Promise.all([
      this.prisma.$queryRaw<{ id: string; name: string; email: string; blockedAt: Date | null }[]>`
        SELECT "id", "name", "email", "blockedAt" FROM "User"
        WHERE "deletedAt" IS NULL AND (yoyo_fold("name") LIKE yoyo_fold(${like}) ESCAPE '\\' OR lower("email") LIKE lower(${like}) ESCAPE '\\' OR "id" = ${query.q})
        ORDER BY "createdAt" DESC LIMIT ${LIMIT}`,
      this.prisma.$queryRaw<{ id: string; title: string | null; status: string; owner: string }[]>`
        SELECT l."id", l."title", l."status"::text AS status, u."name" AS owner FROM "Listing" l JOIN "User" u ON u."id" = l."ownerId"
        WHERE yoyo_fold(coalesce(l."title", '')) LIKE yoyo_fold(${like}) ESCAPE '\\' OR l."id" LIKE ${idPrefix} ESCAPE '\\'
        ORDER BY l."updatedAt" DESC LIMIT ${LIMIT}`,
      this.prisma.$queryRaw<{ id: string; title: string | null; status: string; renter: string; owner: string }[]>`
        SELECT b."id", l."title", b."status"::text AS status, r."name" AS renter, o."name" AS owner
        FROM "Booking" b JOIN "Listing" l ON l."id" = b."listingId" JOIN "User" r ON r."id" = b."renterId" JOIN "User" o ON o."id" = b."ownerId"
        WHERE b."id" LIKE ${idPrefix} ESCAPE '\\' OR yoyo_fold(coalesce(l."title", '')) LIKE yoyo_fold(${like}) ESCAPE '\\'
        ORDER BY b."createdAt" DESC LIMIT ${LIMIT}`,
    ]);
    return {
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, blocked: u.blockedAt !== null })),
      listings: listings.map((l) => ({ id: l.id, title: l.title ?? '', status: l.status, owner: l.owner })),
      deals: deals.map((d) => ({ id: d.id, title: d.title ?? '', status: d.status, renter: d.renter, owner: d.owner })),
    };
  }
}
