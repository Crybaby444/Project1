import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { staffMay, type AdminSection, type PublicUser, type Role } from '@yoyo/shared';
import { AppError } from '../common/app-error';

const ROLES_KEY = 'yoyo:roles';
const SECTION_KEY = 'yoyo:admin-section';

/** Routes for these roles only. Use behind AuthGuard: `@UseGuards(AuthGuard, RolesGuard)`. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** The admin panel section a route belongs to; only staff whose role may open it get in (STAFF_PERMISSIONS). */
export const Section = (section: AdminSection) => SetMetadata(SECTION_KEY, section);

/** 403 AUTH_FORBIDDEN unless the signed-in user has one of the @Roles. The role comes fresh from the DB (AuthGuard). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest<{ user?: PublicUser }>().user;
    if (!user) throw new AppError('AUTH_UNAUTHENTICATED', 401);
    if (!roles.includes(user.role)) throw new AppError('AUTH_FORBIDDEN', 403);
    const section = this.reflector.getAllAndOverride<AdminSection | undefined>(SECTION_KEY, [context.getHandler(), context.getClass()]);
    if (section && !staffMay(user.staffRole, section)) throw new AppError('AUTH_FORBIDDEN', 403, undefined, undefined, { section });
    return true;
  }
}
