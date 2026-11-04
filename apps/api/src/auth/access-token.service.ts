import { Inject, Injectable } from '@nestjs/common';
import { errors, jwtVerify, SignJWT } from 'jose';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { Role } from '../generated/prisma/client';

/** Access tokens live 15 minutes; the refresh token renews them. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** Audience claim that tells access tokens apart from other JWTs signed with the same secret. */
const AUDIENCE = 'yoyo:access';
const ROLES = new Set<string>(Object.values(Role));

export interface AccessClaims {
  sub: string;
  role: Role;
}

/** Short-lived HS256 JWTs carrying `{ sub, role }`. */
@Injectable()
export class AccessTokenService {
  private readonly key: Uint8Array;

  constructor(
    @Inject(ENV) env: Pick<Env, 'JWT_SECRET'>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
  }

  issue(user: { id: string; role: Role }): Promise<string> {
    const now = Math.floor(this.clock.now().getTime() / 1000);
    return new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
      .sign(this.key);
  }

  /** Expired → 401 TOKEN_EXPIRED (refresh and retry); anything else wrong → 401 AUTH_UNAUTHENTICATED. */
  async verify(token: string): Promise<AccessClaims> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        audience: AUDIENCE,
        currentDate: this.clock.now(),
      }));
    } catch (error) {
      if (error instanceof errors.JWTExpired) throw new AppError('TOKEN_EXPIRED', 401);
      throw new AppError('AUTH_UNAUTHENTICATED', 401);
    }
    const { sub, role } = payload;
    if (typeof sub !== 'string' || typeof role !== 'string' || !ROLES.has(role)) {
      throw new AppError('AUTH_UNAUTHENTICATED', 401);
    }
    return { sub, role: role as Role };
  }
}
