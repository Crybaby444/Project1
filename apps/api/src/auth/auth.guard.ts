import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { PublicUser } from '@yoyo/shared';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { AccessTokenService } from './access-token.service';
import { ACCESS_COOKIE } from './cookies';
import { toPublicUser } from './public-user';

/** A request that passed AuthGuard. */
export type AuthedRequest = Request & { user: PublicUser };

function bearerToken(req: Request): string | undefined {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

/**
 * Lets a request through only for a live account. The token comes from `Authorization: Bearer`
 * (apps) or the yoyo_at cookie (site). The user is loaded on every request, so blocking or deleting an
 * account takes effect at once, not when its 15-minute access token runs out.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const token = bearerToken(req) ?? cookies?.[ACCESS_COOKIE];
    if (!token) throw new AppError('AUTH_UNAUTHENTICATED', 401);

    const { sub } = await this.accessTokens.verify(token);
    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user || user.deletedAt !== null) throw new AppError('AUTH_UNAUTHENTICATED', 401);
    if (user.blockedAt !== null) throw new AppError('AUTH_BLOCKED', 403);
    req.user = toPublicUser(user);
    return true;
  }
}
