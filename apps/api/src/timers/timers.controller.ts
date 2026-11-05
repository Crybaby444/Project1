import { createHash, timingSafeEqual } from 'node:crypto';
import { Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { TimersService, type TimersRun } from './timers.service';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Called every 10 minutes by the scheduled GitHub workflow (.github/workflows/timers.yml) with
 * `Authorization: Bearer <TIMERS_SECRET>`; the call also wakes the sleeping free server. Without a
 * configured secret the route does not exist. Not part of the public API (hidden from OpenAPI).
 */
@ApiExcludeController()
@Controller('internal/timers')
export class TimersController {
  constructor(
    private readonly timers: TimersService,
    @Inject(ENV) private readonly env: Pick<Env, 'TIMERS_SECRET'>,
  ) {}

  @Post('run')
  @HttpCode(200)
  run(@Req() req: Request): Promise<TimersRun> {
    const secret = this.env.TIMERS_SECRET;
    if (secret === undefined) throw new AppError('NOT_FOUND', 404);
    const [scheme, token] = (req.get('authorization') ?? '').split(' ');
    // Compared as hashes: equal length, constant time, nothing learned from how fast it fails.
    if (scheme !== 'Bearer' || token === undefined || !timingSafeEqual(digest(token), digest(secret))) {
      throw new AppError('AUTH_UNAUTHENTICATED', 401);
    }
    return this.timers.runDue();
  }
}
