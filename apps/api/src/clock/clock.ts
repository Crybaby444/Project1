import { Global, Injectable, Module } from '@nestjs/common';

/** The only source of "now" for business logic, so tests can move time with a fake clock. */
export interface Clock {
  now(): Date;
}

/** Injection token for the Clock. */
export const CLOCK = Symbol('CLOCK');

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  exports: [CLOCK],
})
export class ClockModule {}
