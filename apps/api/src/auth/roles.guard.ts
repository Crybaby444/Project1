import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PublicUser, Role } from '@yoyo/shared';
import { AppError } from '../common/app-error';

const ROLES_KEY = 'yoyo:roles';

/** Routes for these roles only. Use behind AuthGuard: `@UseGuards(AuthGuard, RolesGuard)`. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

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
    return true;
  }
}
