import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AdminCategoriesSchema,
  AdminCategoryChangeSchema,
  AdminCategoryCreatedSchema,
  AdminCategoryCreateSchema,
  AdminCategoryDeleteQuerySchema,
  type AdminCategory,
  type PublicUser,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuditService } from '../audit/audit.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard, Section } from '../auth/roles.guard';
import { CATALOG_VISIBLE_WHERE } from '../catalog/visibility';
import { freeSlug, slugOf } from '../categories/admin-slug';
import { effectiveOrder, namesOf, toAttributeDef } from '../categories/categories.service';
import { keepKnownAttributes } from '../categories/ensure-categories';
import { ApiErrors } from '../common/api-errors';
import { AppError } from '../common/app-error';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

class AdminCategoriesDto extends createZodDto(AdminCategoriesSchema) {}
class AdminCategoryChangeDto extends createZodDto(AdminCategoryChangeSchema) {}
class AdminCategoryCreateDto extends createZodDto(AdminCategoryCreateSchema) {}
class AdminCategoryCreatedDto extends createZodDto(AdminCategoryCreatedSchema) {}
class AdminCategoryDeleteQueryDto extends createZodDto(AdminCategoryDeleteQuerySchema) {}
type Names = { en: string; lv: string; ru: string };

/**
 * Admin → Categories: the catalog from code, with an administrator's own names, order and hiding on
 * top (the code sync never touches them). Every change goes to the audit log.
 */
@ApiTags('admin')
@Controller('admin/categories')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Section('categories')
export class AdminCategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ZodResponse({ status: 200, type: AdminCategoriesDto, description: 'Every active category with its visible items, hidden ones included' })
  @ApiErrors(401, 403)
  async list(): Promise<{ categories: AdminCategory[] }> {
    const [rows, counts, all] = await Promise.all([
      this.prisma.category.findMany({ where: { active: true } }),
      this.prisma.listing.groupBy({ by: ['categoryId'], where: CATALOG_VISIBLE_WHERE, _count: { _all: true } }),
      this.prisma.listing.groupBy({ by: ['categoryId'], _count: { _all: true } }),
    ]);
    const count = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    const allCount = new Map(all.map((c) => [c.categoryId, c._count._all]));
    const sorted = [...rows].sort((a, b) => effectiveOrder(a) - effectiveOrder(b) || a.slug.localeCompare(b.slug));
    const leaf = (r: (typeof rows)[number]) => ({
      id: r.id,
      slug: r.slug,
      names: namesOf(r),
      defaultNames: r.names as Names,
      renamed: r.adminNames !== null,
      hidden: r.adminHidden,
      items: count.get(r.id) ?? 0,
      custom: r.adminCreated,
      allListings: allCount.get(r.id) ?? 0,
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

  /**
   * A new category, made here (owner, 2026-11-16): a root, or a subcategory of a root. Its addresses are
   * made from the names in each language; it takes listings without extra fields (attributes come from
   * code). Sticker and icon follow its parent.
   */
  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, type: AdminCategoryCreatedDto, description: 'Made; on the site within five minutes' })
  @ApiErrors(400, 401, 403, 404, 409)
  async create(@CurrentUser() admin: PublicUser, @Body() body: AdminCategoryCreateDto): Promise<{ id: string }> {
    const parent = body.parentId === null ? null : await this.prisma.category.findUnique({ where: { id: body.parentId } });
    if (body.parentId !== null && (!parent || !parent.active)) throw new AppError('NOT_FOUND', 404, 'Parent category not found');
    if (parent && parent.parentId !== null) throw new AppError('ACTION_NOT_ALLOWED', 409, 'The catalog has two levels', undefined, { why: 'TOO_DEEP' });
    const created = await this.prisma.$transaction(async (tx) => {
      const everyone = await tx.category.findMany({ select: { slug: true, slugs: true, adminSortOrder: true, sortOrder: true, parentId: true } });
      const taken = (locale: 'en' | 'lv' | 'ru') => new Set(everyone.map((c) => (c.slugs as Record<string, string | undefined>)[locale]).filter((x): x is string => Boolean(x)));
      const slugs = { en: freeSlug(slugOf(body.names.en), taken('en')), lv: freeSlug(slugOf(body.names.lv), taken('lv')), ru: freeSlug(slugOf(body.names.ru), taken('ru')) };
      const slug = freeSlug(`custom-${slugs.en}`, new Set(everyone.map((c) => c.slug)));
      const siblings = everyone.filter((c) => c.parentId === body.parentId);
      const last = siblings.reduce((max, c) => Math.max(max, c.adminSortOrder ?? c.sortOrder), -1);
      return tx.category.create({
        data: {
          slug,
          slugs,
          names: body.names,
          parentId: body.parentId,
          sticker: parent?.sticker ?? 'blue',
          icon: parent?.icon ?? 'box',
          sortOrder: last + 1,
          adminSortOrder: last + 1,
          adminCreated: true,
        },
      });
    });
    await this.audit.record(admin, { action: 'CATEGORY_CREATED', targetType: 'CATEGORY', targetId: created.id, summary: body.names.en, after: { names: body.names, parentId: body.parentId } });
    return { id: created.id };
  }

  /**
   * Deletes a category. Its subcategories go first; its listings (any status) move to `moveTo`, keeping
   * the details the new category knows. A category made here is removed; one from the code catalog
   * stays inactive, so the catalog sync never brings it back.
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiErrors(400, 401, 403, 404, 409)
  async remove(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Query() query: AdminCategoryDeleteQueryDto): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id }, include: { children: { where: { active: true }, select: { id: true } } } });
    if (!category || !category.active) throw new AppError('NOT_FOUND', 404, 'Category not found');
    if (category.children.length > 0) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Delete its subcategories first', undefined, { why: 'HAS_CHILDREN', children: category.children.length });
    const listings = await this.prisma.listing.count({ where: { categoryId: id } });
    let target: Awaited<ReturnType<typeof this.leafWithAttributes>> = null;
    if (listings > 0) {
      if (!query.moveTo) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Choose where its listings go', undefined, { why: 'HAS_LISTINGS', listings });
      target = await this.leafWithAttributes(query.moveTo);
      if (!target || target.id === id) throw new AppError('VALIDATION_FAILED', 400, 'Listings can move only to another subcategory that takes them', { moveTo: 'Not a category that takes listings' });
    }
    await this.prisma.$transaction(async (tx) => {
      if (target) {
        const defs = target.attributes.map(toAttributeDef);
        for (const listing of await tx.listing.findMany({ where: { categoryId: id }, select: { id: true, attributes: true } })) {
          await tx.listing.update({ where: { id: listing.id }, data: { categoryId: target.id, attributes: keepKnownAttributes(listing.attributes, defs) } });
        }
      }
      if (category.adminCreated) await tx.category.delete({ where: { id } });
      else await tx.category.update({ where: { id }, data: { active: false, adminDeleted: true } });
    });
    await this.audit.record(admin, {
      action: 'CATEGORY_DELETED',
      targetType: 'CATEGORY',
      targetId: id,
      summary: namesOf(category).en,
      before: { names: namesOf(category), listings, custom: category.adminCreated },
      after: target ? { movedTo: target.id } : null,
    });
  }

  /** An active category without active subcategories, under an active parent: one a listing can be in. */
  private async leafWithAttributes(id: string) {
    const c = await this.prisma.category.findUnique({
      where: { id },
      include: { attributes: true, children: { where: { active: true }, select: { id: true } }, parent: { select: { active: true } } },
    });
    if (!c || !c.active || c.children.length > 0 || (c.parent && !c.parent.active)) return null;
    return c;
  }
}
