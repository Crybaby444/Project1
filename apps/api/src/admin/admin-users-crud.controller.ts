import { Body, Controller, Delete, HttpCode, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminUserCreatedSchema, AdminUserCreateSchema, AdminUserEditSchema, type PublicUser } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuditService } from '../audit/audit.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { generateUsername } from '../auth/identity';
import { CurrentUser } from '../auth/current-user.decorator';
import { PasswordService } from '../auth/password.service';
import { Roles, RolesGuard, Section } from '../auth/roles.guard';
import { CLOCK, type Clock } from '../clock/clock';
import { ApiErrors } from '../common/api-errors';
import { AppError } from '../common/app-error';
import { Prisma } from '../generated/prisma/client';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';

class AdminUserCreateDto extends createZodDto(AdminUserCreateSchema) {}
class AdminUserCreatedDto extends createZodDto(AdminUserCreatedSchema) {}
class AdminUserEditDto extends createZodDto(AdminUserEditSchema) {}

const emailTaken = () => new AppError('AUTH_EMAIL_TAKEN', 409);
const isUnique = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * Admin → Users: add a person, correct their profile, delete their account (owner, 2026-11-16). Staff
 * accounts are managed in Staff; deleting follows the same rules as a person's own deletion (no open
 * deals, an empty wallet). Every change goes to the audit log.
 */
@ApiTags('admin')
@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Section('users')
export class AdminUsersCrudController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
    private readonly auth: AuthService,
    private readonly me: MeService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, type: AdminUserCreatedDto, description: 'A confirmed account; without a password, a link to set one was emailed' })
  @ApiErrors(400, 401, 403, 409)
  async create(@CurrentUser() admin: PublicUser, @Body() body: AdminUserCreateDto): Promise<{ id: string; passwordLinkSent: boolean }> {
    const now = this.clock.now();
    let id: string;
    try {
      ({ id } = await this.prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          username: await generateUsername(this.prisma, body.email.split('@')[0] ?? body.name),
          locale: body.locale,
          passwordHash: body.password ? await this.passwords.hash(body.password) : null,
          emailVerifiedAt: now,
          createdAt: now,
        },
      }));
    } catch (error) {
      if (isUnique(error)) throw emailTaken();
      throw error;
    }
    const passwordLinkSent = !body.password;
    if (passwordLinkSent) await this.auth.sendSetPasswordLink(id);
    await this.audit.record(admin, { action: 'USER_CREATED', targetType: 'USER', targetId: id, summary: body.email, after: { name: body.name, email: body.email, locale: body.locale } });
    return { id, passwordLinkSent };
  }

  @Patch(':id')
  @HttpCode(204)
  @ApiErrors(400, 401, 403, 404, 409)
  async edit(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: AdminUserEditDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt !== null) throw new AppError('NOT_FOUND', 404, 'User not found');
    const data: Prisma.UserUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined && body.email !== user.email) data.email = body.email;
    if (body.city !== undefined) data.city = body.city || null;
    if (body.about !== undefined) data.about = body.about || null;
    try {
      await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      if (isUnique(error)) throw emailTaken();
      throw error;
    }
    const pick = (u: { name: string; email: string; city: string | null; about: string | null }) => ({ name: u.name, email: u.email, city: u.city, about: u.about });
    const after = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    await this.audit.record(admin, { action: 'USER_EDITED', targetType: 'USER', targetId: id, summary: after.email, before: pick(user), after: pick(after) });
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiErrors(401, 403, 404, 409)
  async remove(@CurrentUser() admin: PublicUser, @Param('id') id: string): Promise<void> {
    if (id === admin.id) throw new AppError('ACTION_NOT_ALLOWED', 409, 'You cannot delete yourself here', undefined, { why: 'SELF' });
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt !== null) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (user.role === 'ADMIN') throw new AppError('ACTION_NOT_ALLOWED', 409, 'Take them out of the staff first', undefined, { why: 'STAFF' });
    await this.me.erase(id);
    await this.audit.record(admin, { action: 'USER_DELETED', targetType: 'USER', targetId: id, summary: user.email, before: { name: user.name, email: user.email } });
  }
}
