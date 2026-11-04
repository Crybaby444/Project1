import type { Clock } from '../../src/clock/clock';

/** A clock that only moves when a test says so. Starts at the real current time unless told otherwise. */
export class FakeClock implements Clock {
  private current: number;

  constructor(start: Date = new Date()) {
    this.current = start.getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current += ms;
  }
}
