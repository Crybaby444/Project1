import { DomainError } from '../errors';
import { findTransition, mayAct, overdueTimer, transitionsFor } from './transitions';
import type { Actor, BookingEventType, BookingSnapshot, DecideContext } from './types';

/** True when `check` passes; false when it refuses with a DomainError. */
function passes(check: () => void): boolean {
  try {
    check();
    return true;
  } catch (error) {
    if (error instanceof DomainError) return false;
    throw error;
  }
}

/**
 * The events `decide` would accept from `actor` right now, with valid data, in the table's order:
 * the site shows one button for each. Read from the same table as `decide`.
 * - Repeating something already done (signing twice) is not an action.
 * - PAY is listed once both have signed, even if the wallet is short: a card can still pay.
 * - After a deadline the sides get nothing; the system gets TIMEOUT until the timer has fired.
 */
export function availableActions(s: BookingSnapshot, actor: Actor, ctx: DecideContext): BookingEventType[] {
  const overdue = overdueTimer(s, ctx.now);
  if (actor.kind === 'SYSTEM') {
    const fires =
      overdue !== undefined && findTransition(s, actor, { type: 'TIMEOUT', timer: overdue }) !== undefined;
    return fires ? ['TIMEOUT'] : [];
  }
  if (overdue !== undefined) return [];

  const actions: BookingEventType[] = [];
  for (const transition of transitionsFor(s, actor.kind)) {
    if (actions.includes(transition.on) || !mayAct(s, actor, transition.on)) continue;
    if (transition.idempotent?.(s, actor)) continue;
    if (!passes(() => transition.guard?.(s, actor, ctx))) continue;
    actions.push(transition.on);
  }
  return actions;
}
