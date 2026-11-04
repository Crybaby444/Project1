import { DomainError } from '../errors';
import { armableTimers, checkContext, checkDate, findTransition, mayAct, overdueTimer } from './transitions';
import type { Change, Transition } from './transitions';
import { TIMER_KINDS } from './types';
import type {
  Actor,
  BookingEvent,
  BookingSnapshot,
  DecideContext,
  Decision,
  Effect,
  TimerKind,
} from './types';

/**
 * Applies one event to a booking: the new snapshot plus the effects the API must carry out, or a
 * `DomainError`. Checks, in order:
 * 0. `ctx.now` is a real moment and `ctx.settings` are valid (`INVALID_INPUT`);
 * 1. the actor is a party (`NOT_A_PARTY`); an admin may only RESOLVE, the system only fire timers;
 * 2. timers: a TIMEOUT whose timer is not armed or not yet due changes nothing; once a deadline has
 *    passed, only its TIMEOUT may act (`TRANSITION_NOT_ALLOWED` with `details.overdueTimer`);
 * 3. the table has a row for this status, event and actor (`TRANSITION_NOT_ALLOWED`);
 * 4. the row's conditions, then the event's data.
 */
export function decide(
  snapshot: BookingSnapshot,
  actor: Actor,
  event: BookingEvent,
  ctx: DecideContext,
): Decision {
  checkContext(ctx);
  if (!mayAct(snapshot, actor, event.type)) {
    throw new DomainError('NOT_A_PARTY', { actor: actor.kind, event: event.type });
  }
  if (event.type === 'TIMEOUT' && actor.kind === 'SYSTEM') {
    const due = snapshot.timers[event.timer];
    // A late, repeated or early job: nothing to do, and no error, so the scheduler can retry freely.
    if (due === undefined) return { next: snapshot, effects: [] };
    // A stored deadline that is not a real moment is refused rather than fired: NaN is never "not yet".
    if (checkDate(due, `timers.${event.timer}`).getTime() > ctx.now.getTime()) {
      return { next: snapshot, effects: [] };
    }
  } else {
    const overdue = overdueTimer(snapshot, ctx.now);
    if (overdue !== undefined) {
      throw new DomainError('TRANSITION_NOT_ALLOWED', {
        status: snapshot.status,
        actor: actor.kind,
        event: event.type,
        overdueTimer: overdue,
      });
    }
  }
  const transition = findTransition(snapshot, actor, event);
  if (transition === undefined) {
    throw new DomainError('TRANSITION_NOT_ALLOWED', {
      status: snapshot.status,
      actor: actor.kind,
      event: event.type,
    });
  }
  if (transition.idempotent?.(snapshot, actor)) return { next: snapshot, effects: [] };
  transition.guard?.(snapshot, actor, ctx);
  return apply(snapshot, transition, event, transition.run(snapshot, actor, event, ctx), ctx.now);
}

/**
 * Builds the next snapshot. Timers the new status cannot hold are dropped with a CANCEL_TIMER effect,
 * except the one whose TIMEOUT is being handled: it has fired and is simply removed. A booking holds
 * one timer at a time, so scheduling a new one also cancels whichever is armed.
 */
function apply(
  s: BookingSnapshot,
  transition: Transition,
  event: BookingEvent,
  change: Change,
  now: Date,
): Decision {
  const fired = event.type === 'TIMEOUT' ? event.timer : undefined;
  const kept = armableTimers(transition.to);
  const timers: Partial<Record<TimerKind, Date>> = {};
  const effects: Effect[] = [];
  for (const timer of TIMER_KINDS) {
    const due = s.timers[timer];
    if (due === undefined || timer === fired) continue;
    if (kept.includes(timer) && change.schedule === undefined) timers[timer] = due;
    else effects.push({ kind: 'CANCEL_TIMER', timer });
  }
  if (change.schedule !== undefined) {
    // Every deadline the engine arms is a real moment; a bad one would be due at once or never.
    checkDate(change.schedule.at, `timers.${change.schedule.timer}`);
    timers[change.schedule.timer] = change.schedule.at;
    effects.push({ kind: 'SCHEDULE', timer: change.schedule.timer, at: change.schedule.at });
  }
  effects.push(...(change.effects ?? []));
  const next: BookingSnapshot = {
    ...s,
    ...change.patch,
    status: transition.to,
    timers,
    updatedAt: now,
    ...(transition.to === 'COMPLETED' ? { completedAt: now } : {}),
  };
  return { next, effects };
}
