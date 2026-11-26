import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AWAKE_EVERY_MS, TimersService, type TimersRun } from './timers.service';

const idle: TimersRun = { fired: 0, failed: 0, offersExpired: 0, moneyJobs: 0, keysForgotten: 0, reminders: 0, more: false };

/** The service with nothing behind it but its env: `runDue` is replaced in each test. */
function service(env: string): TimersService {
  const none = {} as never;
  return new TimersService(none, none, none, none, none, none, none, none, { now: () => new Date() } as never, { NODE_ENV: env } as never);
}

describe('TimersService while the server is awake', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs at start and then every 10 minutes, never two runs at once', async () => {
    const timers = service('production');
    let finish: (run: TimersRun) => void = () => {};
    const runDue = vi.spyOn(timers, 'runDue').mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    timers.onApplicationBootstrap();
    expect(runDue).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(AWAKE_EVERY_MS); // the start-up run is still going: no second one
    expect(runDue).toHaveBeenCalledTimes(1);
    finish(idle);
    await vi.advanceTimersByTimeAsync(AWAKE_EVERY_MS);
    expect(runDue).toHaveBeenCalledTimes(2);
    finish(idle);
    timers.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(3 * AWAKE_EVERY_MS);
    expect(runDue).toHaveBeenCalledTimes(2);
  });

  it('keeps going after a run that failed', async () => {
    const timers = service('production');
    const runDue = vi.spyOn(timers, 'runDue').mockRejectedValueOnce(new Error('database away')).mockResolvedValue(idle);
    timers.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(AWAKE_EVERY_MS);
    expect(runDue).toHaveBeenCalledTimes(2);
    timers.onApplicationShutdown();
  });

  it('does nothing by itself in tests', async () => {
    const timers = service('test');
    const runDue = vi.spyOn(timers, 'runDue').mockResolvedValue(idle);
    timers.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(3 * AWAKE_EVERY_MS);
    expect(runDue).not.toHaveBeenCalled();
  });
});
