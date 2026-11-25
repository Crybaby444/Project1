import { LEDGER_KINDS } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/deals/en.json';
import lv from '../../../messages/deals/lv.json';
import ru from '../../../messages/deals/ru.json';

describe('wallet history labels', () => {
  // A kind without a label showed its raw key ("ledgerKind.BOOKING_PARTIAL_REFUND") on the wallet's filters.
  it.each([
    ['en', en],
    ['lv', lv],
    ['ru', ru],
  ])('every ledger kind has a %s label', (_, messages) => {
    const labels = messages.ledgerKind as Record<string, string>;
    for (const kind of LEDGER_KINDS) expect(labels[kind], kind).toBeTruthy();
  });
});
