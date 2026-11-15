import { Body, Controller, Get, HttpCode, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminCategoriesSchema, AdminCategoryChangeSchema, type AdminCategory, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuditService } from '../audit/audit.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CATALOG_VISIBLE_WHERE } from '../catalog/visibility';
import { effectiveOrder, namesOf } from '../categories/categories.service';
import { ApiErrors } from '../common/api-errors';
import { AppError } from '../common/app-error';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

class AdminCategoriesDto extends createZodDto(AdminCategoriesSchema) {}
class AdminCategoryChangeDto extends createZodDto(AdminCategoryChangeSchema) {}
type Names = { en: string; lv: string; ru: string };

/**
 * Admin → Categories: the catalog from code, with an administrator's own names, order and hiding on
 * top (the code sync never touches them). Every change goes to the audit log.
 */
@ApiTags('admin')
@Controller('admin/categories')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ZodResponse({ status: 200, type: AdminCategoriesDto, description: 'Every active category with its visible items, hidden ones included' })
  @ApiErrors(401, 403)
  async list(): Promise<{ categories: AdminCategory[] }> {
    const [rows, counts] = await Promise.all([
      this.prisma.category.findMany({ where: { active: true } }),
      this.prisma.listing.groupBy({ by: ['categoryId'], where: CATALOG_VISIBLE_WHERE, _count: { _all: true } }),
    ]);
    const count = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    const sorted = [...rows].sort((a, b) => effectiveOrder(a) - effectiveOrder(b) || a.slug.localeCompare(b.slug));
    const leaf = (r: (typeof rows)[number]) => ({
      id: r.id,
      slug: r.slug,
      names: namesOf(r),
      defaultNames: r.names as Names,
      renamed: r.adminNames !== null,
      hidden: r.adminHidden,
      items: count.get(r.id) ?? 0,
    });
    return {
      categories: sorted
        .filter((r) => r.parentId === null)
        .map((root) => {
          const children = sorted.filter((r) => r.parentId === root.id).map(leaf);
          const self = leaf(root);
          return { ...self, items: self.items + children.reduce((a, c) => a + c.items, 0), children };
        }),
    };
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiErrors(400, 401, 403, 404)
  async change(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: AdminCategoryChangeDto): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || !category.active) throw new AppError('NOT_FOUND', 404, 'Category not found');
    const before = { names: namesOf(category), hidden: category.adminHidden, order: effectiveOrder(category) };
    const data: Prisma.CategoryUpdateInput = {};
    if (body.names !== undefined) data.adminNames = body.names === null ? Prisma.DbNull : body.names;
    if (body.hidden !== undefined) data.adminHidden = body.hidden;
    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.category.update({ where: { id }, data });
      }
      if (body.move) {
        const siblings = (await tx.category.findMany({ where: { parentId: category.parentId, active: true } })).sort(
          (a, b) => effectiveOrder(a) - effectiveOrder(b) || a.slug.localeCompare(b.slug),
        );
        const at = siblings.findIndex((s) => s.id === id);
        const to = body.move === 'up' ? at - 1 : at + 1;
        if (to >= 0 && to < siblings.length) [siblings[at], siblings[to]] = [siblings[to]!, siblings[at]!];
        // Renumber the whole group, so the order stays exact.
        for (const [index, sibling] of siblings.entries()) await tx.category.update({ where: { id: sibling.id }, data: { adminSortOrder: index } });
      }
    });
    const after = await this.prisma.category.findUniqueOrThrow({ where: { id } });
    await this.audit.record(admin, {
      action: 'CATEGORY_CHANGED',
      targetType: 'CATEGORY',
      targetId: id,
      summary: namesOf(after).en,
      before,
      after: { names: namesOf(after), hidden: after.adminHidden, order: effectiveOrder(after) },
    });
  }
}
