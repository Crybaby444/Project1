import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { PublicUser } from '@yoyo/shared';
import { AppError } from '../common/app-error';

/** The user AuthGuard let through. Use only on routes behind AuthGuard. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): PublicUser => {
  const user = context.switchToHttp().getRequest<{ user?: PublicUser }>().user;
  if (!user) throw new AppError('AUTH_UNAUTHENTICATED', 401);
  return user;
});
