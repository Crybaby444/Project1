import { createHash } from 'node:crypto';
import { type CallHandler, type ExecutionContext, HttpStatus, Inject, Injectable, type NestInterceptor } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { catchError, from, mergeMap, type Observable, of, throwError } from 'rxjs';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IDEMPOTENT_KEY, type IdempotentOptions } from './idempotent.decorator';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
/** A request still IN_PROGRESS after this long died with its process; its key may be used again. */
const ABANDONED_AFTER_MS = 5 * 60_000;

/** JSON with object keys sorted, so `{a,b}` and `{b,a}` are the same request. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const isUniqueViolation = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * Handles `@Idempotent` routes. The first request with a key records it IN_PROGRESS, runs, and stores
 * its status and (already serialized) body; a repeat with the same key and request gets that answer
 * with `Idempotent-Replayed: true`. A failed request frees its key. Keys belong to the signed-in user.
 * Registered before ZodSerializerInterceptor, so it stores exactly what the client received.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<IdempotentOptions | undefined>(IDEMPOTENT_KEY, context.getHandler());
    if (!options || context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = req.get(IDEMPOTENCY_HEADER);
    if (key === undefined || key === '') {
      if (options.required) throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 400);
      return next.handle();
    }
    if (!KEY_PATTERN.test(key)) {
      throw new AppError('VALIDATION_FAILED', 400, undefined, { [IDEMPOTENCY_HEADER]: '8–100 letters, digits, - or _' });
    }
    const userId = req.user?.id;
    if (!userId) throw new AppError('AUTH_UNAUTHENTICATED', 401);
    const scope = `${req.method} ${req.baseUrl}${req.path}`;
    const requestHash = createHash('sha256').update(`${scope}\n${canonical(req.body ?? {})}`).digest('hex');
    const status: number =
      this.reflector.get<number | undefined>(HTTP_CODE_METADATA, context.getHandler()) ??
      (req.method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK);

    return from(this.claim(userId, key, scope, requestHash)).pipe(
      mergeMap((stored) => {
        if (stored) {
          res.status(stored.statusCode);
          res.setHeader('Idempotent-Replayed', 'true');
          return of(stored.body);
        }
        return next.handle().pipe(
          mergeMap((body: unknown) =>
            from(
              this.prisma.idempotencyKey.update({
                where: { userId_key: { userId, key } },
                data: { state: 'DONE', statusCode: status, body: (body ?? null) as Prisma.InputJsonValue },
              }),
            ).pipe(mergeMap(() => of(body))),
          ),
          catchError((error: unknown) =>
            from(this.prisma.idempotencyKey.deleteMany({ where: { userId, key } })).pipe(mergeMap(() => throwError(() => error))),
          ),
        );
      }),
    );
  }

  /** Records the key, or returns the stored answer of a finished identical request; refuses the rest. */
  private async claim(
    userId: string,
    key: string,
    scope: string,
    requestHash: string,
  ): Promise<{ statusCode: number; body: unknown } | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.prisma.idempotencyKey.create({ data: { userId, key, scope, requestHash, createdAt: this.clock.now() } });
        return null;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
      const existing = await this.prisma.idempotencyKey.findUnique({ where: { userId_key: { userId, key } } });
      if (!existing) continue; // freed in between: try once more
      if (existing.requestHash !== requestHash) throw new AppError('IDEMPOTENCY_KEY_REUSED', 409);
      if (existing.state === 'DONE') return { statusCode: existing.statusCode ?? 200, body: existing.body };
      if (this.clock.now().getTime() - existing.createdAt.getTime() > ABANDONED_AFTER_MS) {
        await this.prisma.idempotencyKey.deleteMany({ where: { userId, key, state: 'IN_PROGRESS', createdAt: existing.createdAt } });
        continue;
      }
      throw new AppError('IDEMPOTENCY_IN_PROGRESS', 409);
    }
    throw new AppError('IDEMPOTENCY_IN_PROGRESS', 409);
  }
}
