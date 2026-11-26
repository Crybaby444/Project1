import { AUDIT_ACTIONS, LEDGER_KINDS } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/deals/en.json';
import lv from '../../../messages/deals/lv.json';
import ru from '../../../messages/deals/ru.json';
import adminEn from '../../../messages/admin/en.json';
import adminLv from '../../../messages/admin/lv.json';
import adminRu from '../../../messages/admin/ru.json';

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

  // The admin's money page filters by the same kinds.
  it.each([
    ['en', adminEn],
    ['lv', adminLv],
    ['ru', adminRu],
  ])('every ledger kind has a %s label in the admin money page', (_, messages) => {
    const labels = messages.admin.money.kind as Record<string, string>;
    for (const kind of LEDGER_KINDS) expect(labels[kind], kind).toBeTruthy();
  });

  // The admin's action log names every action; a new one without a label showed its raw key.
  it.each([
    ['en', adminEn],
    ['lv', adminLv],
    ['ru', adminRu],
  ])('every audit action has a %s label', (_, messages) => {
    const labels = messages.admin.audit.action as Record<string, string>;
    for (const action of AUDIT_ACTIONS) expect(labels[action], action).toBeTruthy();
  });
});
