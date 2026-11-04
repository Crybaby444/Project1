import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ENV, type Env } from '../config/env';
import { AppError } from './app-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF guard for cookie sessions (with SameSite=Lax cookies): an unsafe request that carries an
 * Origin header must come from the web app. Requests without Origin (mobile apps, server-to-server)
 * cannot ride on a browser's cookies, so they pass.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Pick<Env, 'WEB_ORIGIN'>) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (origin === undefined || origin === this.env.WEB_ORIGIN) return true;
    throw new AppError('ORIGIN_FORBIDDEN', 403);
  }
}
