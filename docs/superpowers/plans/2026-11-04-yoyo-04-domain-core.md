# Yoyo — План 4: Ядро логики (деньги, цены, даты, сделка, кошелёк). План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Чистое ядро бизнес-правил Yoyo в новом пакете `@yoyo/domain`. В него входят:
- деньги в центах;
- расчёт аренды, скидки, сервисного сбора и залога;
- календарные дни и проверка занятости;
- конечный автомат сделки: правило залога, отмены, тайм-ауты, споры;
- журнал проводок кошелька.

Ни базы, ни HTTP, ни часов: только функции «состояние + событие → новое состояние + эффекты». Планы «Объявления» и «Сделка и кошелёк» подключат ядро к базе, API и экранам.

**Architecture:** functional core, imperative shell.
- `decide(booking, actor, event, ctx)` возвращает `{ next, effects }` или бросает `DomainError`.
- Эффекты — это данные: проводки, таймеры, уведомления, системные сообщения чата, «занять/освободить даты», «создать договор». API позже выполнит их в одной транзакции (план 8).
- Деньги хранятся целыми центами EUR. Дни — строки `LocalDate` в часовом поясе вещи. Время приходит снаружи как `ctx.now`.

**Tech Stack:**
- TypeScript strict;
- сборка tsup (ESM + CJS, как у `@yoyo/shared`);
- Vitest и fast-check для свойств (property-based tests);
- рантайм-зависимостей нет, кроме типов из `@yoyo/shared`.

**Spec:** [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md):
- §0 — смена направления (имеет приоритет);
- §4.3 — поля цены;
- §4.4 — сделка;
- §4.5 — кошелёк;
- §4.6 — «предложить цену»;
- §6 — сущности.

## Global Constraints

**Общие**
- Действуют Global Constraints плана 1: TypeScript strict, политика pnpm о возрасте релизов, никаких скриптов установки.
- **Чистота.** Никаких `Date.now()`, `new Date()` без аргумента, `Math.random()`, ввода-вывода, переменных окружения. Всё приходит аргументами, функции детерминированы. Тест проверяет это поиском запрещённых вызовов в `src/` (тестовые файлы исключены).

**Деньги**
- Целые центы, тип `Cents`. Проценты — целые 0–100.
- Округление до цента вверх от половины: `Math.floor((amount * percent + 50) / 100)`. Дробных чисел в деньгах нет нигде.
- Валюта только EUR.

**Даты**
- `LocalDate` = `'YYYY-MM-DD'`.
- Период включает оба конца: `[start, end]`, дней = `end − start + 1`.
- «Сегодня» = `localDateIn(now, timeZone)`, часовой пояс вещи по умолчанию `Europe/Riga`.

**Ошибки**
- `DomainError` с `code` из закрытого списка (Task 1) и необязательными `details`.
- Коды переводит в HTTP слой API (план 8). Здесь HTTP нет.

**Настройки**
- Приходят объектом `BookingSettings`, базу ядро не читает.
- Значения по умолчанию `DEFAULT_BOOKING_SETTINGS`:
  - `requestTtlHours` 24, `paymentTtlHours` 24;
  - `handoverConfirmHours` 48, `returnConfirmHours` 48;
  - `inspectionHours` 48, `damageReplyHours` 48;
  - `servicePercent` 10, `maxAdvanceDays` 365, `reviewWindowDays` 14.
- Значения, которые уже есть в `SETTING_DEFAULTS` из `@yoyo/shared`, должны совпадать. Это проверяет тест, чтобы они не разошлись.

**Границы параллельной работы**
- Параллельно идёт план 3. Не менять `packages/shared`, `apps/*`, корневой `README.md` и CI.
- Можно трогать только новый пакет `packages/domain` и `pnpm-lock.yaml`.
- Корневой README упоминает пакет позже, при слиянии.

**Документация**
- Всё экспортируется из `src/index.ts`.
- В `packages/domain/README.md` (по-русски) диаграмма состояний (mermaid) и таблица переходов из Task 5.

## Review Focus

1. **Сохранение денег.** Для любой допустимой последовательности событий:
   - каждая операция журнала в сумме даёт ноль;
   - кошельки не уходят в минус;
   - счета `escrow:<id>` и `deposit:<id>` равны нулю в любом конечном состоянии;
   - доход платформы равен сумме сборов оплаченных и не возвращённых сделок.
   Тест — свойство fast-check в Task 6.
2. **Устаревшие таймеры.** Таймер, сработавший после смены состояния, ничего не меняет и денег не двигает. Примеры: проверка истекла после «Всё в порядке»; таймер сработал дважды; сработал раньше срока. Тест в Task 5.
3. **Отмена после «Передал».** Как только владелец отметил «Передал», арендатор не может отменить сделку с полным возвратом, держа вещь в руках. Остаются только «Получил» или «Не получил». Тест в Task 5.
4. **Сдвиг на день и часовые пояса.**
   - Аренда с 27 по 29 марта 2027 (в Риге 28-го переход на летнее время) — это 3 дня.
   - Для вещи в Риге в 22:30 UTC 3 ноября 2026 «сегодня» уже 4 ноября.
   - Срок «до конца дня начала аренды» на 28.03.2027 — это `2027-03-28T21:00:00Z`.
   Тест в Task 2.
5. **Округление.**
   - Сбор 10 % с 12,34 € — это 1,23 €, с 0,05 € — 0,01 €, с 0,04 € — 0 €.
   - Скидка и сбор считаются от сумм за период, а не по дням.
   - Итог всегда равен сумме частей.
   Тест в Task 3.

---

## Структура файлов (итог плана)

```
packages/domain/package.json · tsconfig.json · tsup.config.ts · vitest.config.ts · README.md
packages/domain/src/index.ts
packages/domain/src/errors.ts          DomainError, DomainErrorCode
packages/domain/src/money.ts           Cents, cents, add, sub, mulInt, percentOf, formatMoney
packages/domain/src/dates.ts           LocalDate, localDate, localDateIn, addDays, diffDays, endOfDayIn, Period, period, daysIn, overlaps, firstConflict, validateRentalPeriod
packages/domain/src/pricing.ts         ListingPricing, validatePricing, Quote, quote, validateOffer
packages/domain/src/settings.ts        BookingSettings, DEFAULT_BOOKING_SETTINGS
packages/domain/src/ledger.ts          AccountId, Posting, LedgerOperation, builders, assertBalanced, applyOperation
packages/domain/src/booking/types.ts   BookingStatus, BookingSnapshot, Actor, BookingEvent, TimerKind, Effect, Decision
packages/domain/src/booking/request.ts createRequest
packages/domain/src/booking/decide.ts  decide
packages/domain/src/booking/actions.ts availableActions
packages/domain/src/reviews.ts         canReview
(тесты рядом: *.test.ts; свойства: src/booking/conservation.test.ts)
```

---

### Task 1: Пакет, ошибки, деньги

**Files:**
- Create: `packages/domain/{package.json,tsconfig.json,tsup.config.ts,vitest.config.ts}` по образцу `packages/shared` (те же поля `exports`, `main`, `module`, `types`, скрипты `build`, `test`, `lint`, `typecheck`); `src/{index.ts,errors.ts,money.ts}`.
- Test: `src/money.test.ts`, `src/purity.test.ts`.

**Interfaces:**
- Produces:
  - `type DomainErrorCode`: `'INVALID_AMOUNT' | 'INVALID_PERCENT' | 'INVALID_DATE' | 'INVALID_PERIOD' | 'START_IN_PAST' | 'TOO_FAR_AHEAD' | 'PERIOD_TOO_SHORT' | 'PERIOD_TOO_LONG' | 'DATES_UNAVAILABLE' | 'INVALID_PRICING' | 'INVALID_OFFER' | 'CANNOT_RENT_OWN' | 'INSUFFICIENT_FUNDS' | 'UNBALANCED_OPERATION' | 'NEGATIVE_BALANCE' | 'NOT_A_PARTY' | 'TRANSITION_NOT_ALLOWED' | 'CONTRACT_NOT_SIGNED' | 'INVALID_INPUT'`.
  - `class DomainError extends Error { readonly code: DomainErrorCode; readonly details?: Record<string, unknown> }`.
  - `type Cents = number & { readonly __cents: unique symbol }`.
  - `cents(value: number): Cents`: безопасное целое ≥ 0, иначе `INVALID_AMOUNT`.
  - `add(...values: Cents[]): Cents`, `sub(a: Cents, b: Cents): Cents` (результат < 0 → `INVALID_AMOUNT`), `mulInt(a: Cents, n: number): Cents`.
  - `percentOf(amount: Cents, percent: number): Cents`: целое 0–100, иначе `INVALID_PERCENT`.
  - `formatMoney(amount: Cents, locale: Locale): string` (`Locale` из `@yoyo/shared`): en → `en-IE`, lv → `lv-LV`, ru → `ru-RU`, всегда два знака.

- [ ] **Step 1: Write the failing tests**

```ts
expect(percentOf(cents(1234), 10)).toBe(123);
expect(percentOf(cents(5), 10)).toBe(1);
expect(percentOf(cents(4), 10)).toBe(0);
expect(() => percentOf(cents(100), 10.5)).toThrow(expect.objectContaining({ code: 'INVALID_PERCENT' }));
expect(() => cents(1.5)).toThrow(expect.objectContaining({ code: 'INVALID_AMOUNT' }));
expect(() => sub(cents(1), cents(2))).toThrow(expect.objectContaining({ code: 'INVALID_AMOUNT' }));
const norm = (s: string) => s.replace(/\s/g, ' ');
expect(norm(formatMoney(cents(123450), 'en'))).toBe('€1,234.50');
expect(norm(formatMoney(cents(123450), 'lv'))).toBe('1 234,50 €');
expect(norm(formatMoney(cents(123450), 'ru'))).toBe('1 234,50 €');
// purity.test.ts: ни один файл src/**/*.ts (кроме *.test.ts) не содержит Date.now(, Math.random(, new Date() без аргумента, process.env
```

- [ ] **Step 2: Run, verify FAIL.** `pnpm --filter @yoyo/domain test`. Expected: FAIL (модулей нет).
- [ ] **Step 3: Implement.** Пакет подхватывается Turborepo без правок `turbo.json`.
- [ ] **Step 4: Run, verify PASS.** Плюс `pnpm turbo run lint typecheck test build --filter=@yoyo/domain`.
- [ ] **Step 5: Commit.** `feat(domain): package with domain errors and integer money`.

---

### Task 2: Дни, периоды, занятость

**Files:** Create `src/dates.ts`. Test `src/dates.test.ts`.

**Interfaces:**
- Produces:
  - `type LocalDate = string & { readonly __localDate: unique symbol }`.
  - `localDate(value: string): LocalDate`: строго `YYYY-MM-DD` и реальная дата, иначе `INVALID_DATE`.
  - `localDateIn(instant: Date, timeZone: string): LocalDate` через `Intl.DateTimeFormat`.
  - `addDays(date, n): LocalDate`, `diffDays(a, b): number` (`b − a` в днях; арифметика по UTC над Y-M-D, без влияния летнего времени), `compareDates(a, b): -1 | 0 | 1`.
  - `endOfDayIn(date: LocalDate, timeZone: string): Date`: момент, когда в этом поясе наступает следующая дата (полночь `date + 1`), с учётом перехода времени.
  - `interface Period { readonly start: LocalDate; readonly end: LocalDate }`, `period(start, end): Period` (`end < start` → `INVALID_PERIOD`), `daysIn(p): number`, `overlaps(a, b): boolean` (общий день = пересечение), `firstConflict(p, blocked: readonly Period[]): Period | null`.
  - `validateRentalPeriod(p, rules: { today: LocalDate; minDays: number; maxDays: number; maxAdvanceDays: number }): void`:
    - `start < today` → `START_IN_PAST`;
    - `start > today + maxAdvanceDays` → `TOO_FAR_AHEAD`;
    - дней меньше `minDays` → `PERIOD_TOO_SHORT`, больше `maxDays` → `PERIOD_TOO_LONG`.

- [ ] **Step 1: Write the failing tests** (Review Focus 4)

```ts
expect(daysIn(period(localDate('2027-03-27'), localDate('2027-03-29')))).toBe(3);
expect(localDateIn(new Date('2026-11-03T22:30:00Z'), 'Europe/Riga')).toBe('2026-11-04');
expect(localDateIn(new Date('2027-07-01T21:30:00Z'), 'Europe/Riga')).toBe('2027-07-02');
expect(endOfDayIn(localDate('2027-03-28'), 'Europe/Riga').toISOString()).toBe('2027-03-28T21:00:00.000Z');
expect(endOfDayIn(localDate('2026-11-04'), 'Europe/Riga').toISOString()).toBe('2026-11-04T22:00:00.000Z');
expect(() => localDate('2026-02-29')).toThrow(expect.objectContaining({ code: 'INVALID_DATE' }));
expect(overlaps(p('2026-11-10', '2026-11-12'), p('2026-11-12', '2026-11-14'))).toBe(true);
expect(overlaps(p('2026-11-10', '2026-11-11'), p('2026-11-12', '2026-11-14'))).toBe(false);
expect(firstConflict(p('2026-11-10', '2026-11-20'), [p('2026-11-01', '2026-11-05'), p('2026-11-15', '2026-11-16')])).toEqual(p('2026-11-15', '2026-11-16'));
expect(() => validateRentalPeriod(p('2026-11-03', '2026-11-04'), { today: localDate('2026-11-04'), minDays: 1, maxDays: 30, maxAdvanceDays: 365 }))
  .toThrow(expect.objectContaining({ code: 'START_IN_PAST' }));
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(domain): calendar days, periods and availability checks`.

---

### Task 3: Цена, скидка, сбор, предложение цены

**Files:** Create `src/pricing.ts`, `src/settings.ts`. Test `src/pricing.test.ts`, `src/settings.test.ts`.

**Interfaces:**
- Consumes: Task 1 и 2.
- Produces:
  - `interface ListingPricing { dailyCents: Cents; weeklyDiscountPercent: number; depositCents: Cents; minDays: number; maxDays: number }`.
  - `validatePricing(p): void` бросает `INVALID_PRICING` с `details.field`, если не выполнено одно из условий:
    - `dailyCents` от 100 до 1 000 000;
    - скидка — целое 0–90;
    - `depositCents` от 0 до 5 000 000;
    - `1 ≤ minDays ≤ maxDays ≤ 365`.
  - `interface Quote { days; dailyCents; baseCents; discountPercent; discountCents; rentCents; serviceFeeCents; depositCents; totalCents; ownerPayoutCents }`.
  - `quote(input: { pricing: ListingPricing; days: number; servicePercent: number; agreedDailyCents?: Cents }): Quote`. Порядок расчёта:
    1. `daily = agreedDailyCents ?? pricing.dailyCents`.
    2. `base = daily × days`.
    3. Скидка недели действует, если `days ≥ 7` и цена **не** договорная. Принятое предложение цены — окончательная цена в день, скидки с ним не складываются ([моё решение]).
    4. `rent = base − discount`, `fee = percentOf(rent, servicePercent)`.
    5. `total = rent + fee + deposit`, `ownerPayout = rent`.
    6. Если `days` вне `[minDays, maxDays]` — `PERIOD_TOO_SHORT` или `PERIOD_TOO_LONG`.
  - `validateOffer(pricing, offerDailyCents: Cents): void`: нужно `100 ≤ offer < dailyCents`, иначе `INVALID_OFFER`. Предлагать цену выше или равную заявленной бессмысленно.
  - `interface BookingSettings` и `DEFAULT_BOOKING_SETTINGS` из Global Constraints.

- [ ] **Step 1: Write the failing tests** (Review Focus 5)

```ts
const p = { dailyCents: cents(1500), weeklyDiscountPercent: 20, depositCents: cents(10000), minDays: 1, maxDays: 30 };
expect(quote({ pricing: p, days: 3, servicePercent: 10 })).toEqual({ days: 3, dailyCents: 1500, baseCents: 4500, discountPercent: 0,
  discountCents: 0, rentCents: 4500, serviceFeeCents: 450, depositCents: 10000, totalCents: 14950, ownerPayoutCents: 4500 });
expect(quote({ pricing: p, days: 7, servicePercent: 10 })).toMatchObject({ baseCents: 10500, discountPercent: 20, discountCents: 2100,
  rentCents: 8400, serviceFeeCents: 840, totalCents: 19240 });
expect(quote({ pricing: p, days: 7, servicePercent: 10, agreedDailyCents: cents(1200) })).toMatchObject({ dailyCents: 1200, discountPercent: 0, rentCents: 8400 });
expect(quote({ pricing: { ...p, dailyCents: cents(1234), weeklyDiscountPercent: 0 }, days: 1, servicePercent: 10 }).serviceFeeCents).toBe(123);
expect(() => quote({ pricing: p, days: 31, servicePercent: 10 })).toThrow(expect.objectContaining({ code: 'PERIOD_TOO_LONG' }));
expect(() => validateOffer(p, cents(1500))).toThrow(expect.objectContaining({ code: 'INVALID_OFFER' }));
// свойство (fast-check): total === rent + fee + deposit; rent <= base; fee <= rent; всё — целые ≥ 0
// settings.test.ts: значения DEFAULT_BOOKING_SETTINGS совпадают с SETTING_DEFAULTS там, где ключ есть в обоих
//   ('booking.requestTtlHours', 'booking.inspectionHours', 'booking.damageReplyHours', 'review.windowDays', 'fees.servicePercent')
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(domain): rental quote with weekly discount, service fee and price offers`.

---

### Task 4: Журнал проводок

**Files:** Create `src/ledger.ts`. Test `src/ledger.test.ts`.

**Interfaces:**
- Produces:
  - ``type AccountId = `wallet:${string}` | `escrow:${string}` | `deposit:${string}` | 'platform:revenue' | 'external:card'``.
    - `wallet:<userId>` — доступный баланс пользователя;
    - `escrow:<bookingId>` — арендная плата, удерживаемая до передачи;
    - `deposit:<bookingId>` — замороженный залог;
    - `external:card` — внешний мир (имитация карты; минус = деньги пришли извне).
  - `interface Posting { readonly account: AccountId; readonly amount: number }`: целое со знаком, не ноль.
  - `type OperationKind = 'TOP_UP' | 'WITHDRAWAL' | 'BOOKING_PAYMENT' | 'RENT_RELEASE' | 'DEPOSIT_REFUND' | 'DEPOSIT_TO_OWNER' | 'BOOKING_REFUND'`.
  - `interface LedgerOperation { readonly kind: OperationKind; readonly postings: readonly Posting[]; readonly bookingId?: string }`.
  - `type PaymentMethod = 'WALLET' | 'CARD'`. Конструкторы (нулевые суммы не дают проводок):
    - `topUp(userId, amount)`;
    - `withdraw(userId, amount)`;
    - `bookingPayment({ bookingId, renterId, quote, method })`: карта или кошелёк платят `total`; `escrow` получает `rent`, `deposit` получает `deposit`, `platform:revenue` получает `fee`;
    - `rentRelease({ bookingId, ownerId, rentCents })`;
    - `depositRefund({ bookingId, renterId, depositCents })`;
    - `depositToOwner({ bookingId, ownerId, depositCents })`;
    - `bookingRefund({ bookingId, renterId, quote, method })`: всё возвращается тем же способом, которым платили; сбор списывается с `platform:revenue`.
  - `assertBalanced(op): void` → `UNBALANCED_OPERATION`.
  - `applyOperation(balances: ReadonlyMap<AccountId, number>, op): Map<AccountId, number>`:
    - `wallet:*` уходит в минус → `INSUFFICIENT_FUNDS`;
    - `escrow:*` или `deposit:*` уходит в минус → `NEGATIVE_BALANCE`;
    - `external:card` и `platform:revenue` ограничений не имеют.

- [ ] **Step 1: Write the failing tests:**
  - каждый конструктор даёт сбалансированную операцию;
  - оплата из кошелька при нехватке → `INSUFFICIENT_FUNDS`;
  - после `bookingPayment` + `bookingRefund` все счета, кроме `external:card`, такие же, как до них;
  - карта при оплате и возврате видна только как `external:card`;
  - залог 0 → в `bookingPayment` нет проводки на `deposit:*`, а `depositRefund` возвращает `null` вместо пустой операции.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(domain): double-entry ledger operations for wallet, escrow and deposits`.

---

### Task 5: Автомат сделки

**Files:** Create `src/booking/{types.ts,request.ts,decide.ts}`. Test `src/booking/decide.test.ts`, `src/booking/request.test.ts`.

**Interfaces:**
- Consumes: Task 1–4.
- Produces:
  - `type BookingStatus = 'REQUESTED' | 'ACCEPTED' | 'PAID' | 'ACTIVE' | 'RETURNED' | 'DAMAGE_CLAIMED' | 'DISPUTED' | 'COMPLETED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED'`. Конечные: `COMPLETED`, `DECLINED`, `EXPIRED`, `CANCELLED`.
  - `type TimerKind = 'REQUEST_EXPIRY' | 'PAYMENT_EXPIRY' | 'HANDOVER_CONFIRM' | 'RETURN_CONFIRM' | 'INSPECTION' | 'DAMAGE_REPLY'`.
  - `interface BookingSnapshot`:
    - идентификаторы и период: `id`, `listingId`, `renterId`, `ownerId`, `status`, `period: Period`, `timeZone`, `quote: Quote`;
    - моменты подписей и отметок: `renterSignedAt?`, `ownerSignedAt?`, `paymentMethod?`, `ownerHandedOverAt?`, `renterReceivedAt?`, `renterReturnedAt?`, `ownerReceivedBackAt?`;
    - разбирательства: `damage?: { description; photoIds: string[]; claimedAt }`, `dispute?: { reason: 'DAMAGE' | 'NOT_RETURNED' | 'NOT_HANDED_OVER'; openedAt; note? }`;
    - итог: `outcome?: 'DEPOSIT_REFUNDED' | 'DEPOSIT_TO_OWNER' | 'REFUNDED_ALL'`, `cancellation?: { by: 'RENTER' | 'OWNER' | 'ADMIN'; reason: string; at }`;
    - `timers: Partial<Record<TimerKind, Date>>` — взведённые таймеры и их сроки;
    - моменты статусов: `createdAt`, `updatedAt`, `completedAt?`.
  - `type Actor = { kind: 'RENTER'; userId } | { kind: 'OWNER'; userId } | { kind: 'ADMIN'; userId } | { kind: 'SYSTEM' }`.
  - `type BookingEvent` — объединение по `type`:
    - `ACCEPT`, `DECLINE{reason?}`, `WITHDRAW`, `SIGN`, `PAY{method}`, `CANCEL{reason}`;
    - `MARK_HANDED_OVER`, `CONFIRM_RECEIVED`, `REPORT_NOT_RECEIVED{note}`;
    - `MARK_RETURNED`, `CONFIRM_RETURNED`, `REPORT_NOT_RETURNED{note}`;
    - `ALL_FINE`, `REPORT_DAMAGE{description, photoIds}`, `ACCEPT_DAMAGE`, `REJECT_DAMAGE{note}`;
    - `RESOLVE{decision: 'REFUND_DEPOSIT' | 'DEPOSIT_TO_OWNER' | 'REFUND_ALL' | 'CONFIRM_HANDOVER', comment}`;
    - `TIMEOUT{timer}`.
  - `type Effect` — объединение по `kind`:
    - `LEDGER{operation}`;
    - `SCHEDULE{timer, at}`, `CANCEL_TIMER{timer}`;
    - `RESERVE_DATES`, `RELEASE_DATES`, `GENERATE_CONTRACT`;
    - `NOTIFY{to: 'RENTER' | 'OWNER' | 'ADMINS', template}`;
    - `SYSTEM_MESSAGE{template}`.
    Шаблоны — закрытый список строк `BookingTemplate`: `REQUESTED`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `SIGNED`, `PAID`, `CANCELLED`, `HANDED_OVER`, `RECEIVED`, `RETURNED`, `RECEIVED_BACK`, `ALL_FINE`, `DAMAGE_REPORTED`, `DAMAGE_ACCEPTED`, `DISPUTE_OPENED`, `DISPUTE_RESOLVED`.
  - `interface Decision { next: BookingSnapshot; effects: Effect[] }`.
  - `interface DecideContext { now: Date; settings: BookingSettings; blocked?: readonly Period[]; walletAvailableCents?: Cents }`:
    - `blocked` — занятые периоды без этой сделки, нужны для `ACCEPT`;
    - `walletAvailableCents` нужен для `PAY` из кошелька.
  - `createRequest(input: { id; listingId; renterId; ownerId; period; timeZone; pricing: ListingPricing; agreedDailyCents?; blocked: readonly Period[] }, ctx: DecideContext): Decision`. Проверки: `renterId ≠ ownerId` (`CANNOT_RENT_OWN`), `validateRentalPeriod`, `firstConflict` (`DATES_UNAVAILABLE`), `quote`.
  - `decide(snapshot, actor, event, ctx): Decision`. Порядок проверок:
    1. Участник: `RENTER` должен совпадать с `renterId`, `OWNER` с `ownerId`, иначе `NOT_A_PARTY`. `ADMIN` допустим только для `RESOLVE`, `SYSTEM` только для `TIMEOUT`.
    2. Строка таблицы ниже; если её нет — `TRANSITION_NOT_ALLOWED`.
    3. Условия строки.

**Переходы.** `ttl(x)` = `min(now + x часов, endOfDayIn(period.start, timeZone))`: после конца первого дня аренды неотвеченный запрос и неоплаченная бронь теряют смысл.

| Из | Событие (кто) | Условие | В | Эффекты |
|---|---|---|---|---|
| — | `createRequest` (арендатор) | см. выше | REQUESTED | SCHEDULE REQUEST_EXPIRY `ttl(requestTtlHours)`; NOTIFY OWNER REQUESTED; SYSTEM_MESSAGE REQUESTED |
| REQUESTED | ACCEPT (владелец) | `firstConflict(period, blocked)` пусто, иначе `DATES_UNAVAILABLE` | ACCEPTED | CANCEL_TIMER REQUEST_EXPIRY; SCHEDULE PAYMENT_EXPIRY `ttl(paymentTtlHours)`; RESERVE_DATES; GENERATE_CONTRACT; NOTIFY RENTER; SYSTEM_MESSAGE ACCEPTED |
| REQUESTED | DECLINE (владелец) | — | DECLINED | CANCEL_TIMER; NOTIFY RENTER; SYSTEM_MESSAGE |
| REQUESTED | WITHDRAW (арендатор) | — | CANCELLED (by RENTER) | CANCEL_TIMER; NOTIFY OWNER; SYSTEM_MESSAGE |
| REQUESTED | TIMEOUT REQUEST_EXPIRY | таймер взведён и срок наступил | EXPIRED | NOTIFY RENTER и OWNER; SYSTEM_MESSAGE |
| ACCEPTED | SIGN (любая сторона) | повторная подпись — без изменений и без эффектов | ACCEPTED | SYSTEM_MESSAGE SIGNED |
| ACCEPTED | PAY{method} (арендатор) | обе подписи есть (`CONTRACT_NOT_SIGNED`); для WALLET `walletAvailableCents ≥ total` (`INSUFFICIENT_FUNDS`) | PAID | CANCEL_TIMER PAYMENT_EXPIRY; LEDGER bookingPayment; NOTIFY OWNER; SYSTEM_MESSAGE PAID |
| ACCEPTED | CANCEL{reason} (любая сторона) | — | CANCELLED | CANCEL_TIMER; RELEASE_DATES; NOTIFY другой стороне; SYSTEM_MESSAGE |
| ACCEPTED | TIMEOUT PAYMENT_EXPIRY | таймер взведён | EXPIRED | RELEASE_DATES; NOTIFY обоим; SYSTEM_MESSAGE |
| PAID | MARK_HANDED_OVER (владелец) | ещё не отмечено | PAID | SCHEDULE HANDOVER_CONFIRM `now + handoverConfirmHours`; NOTIFY RENTER; SYSTEM_MESSAGE HANDED_OVER |
| PAID | CONFIRM_RECEIVED (арендатор) или TIMEOUT HANDOVER_CONFIRM | для таймера: владелец отметил «Передал» | ACTIVE | CANCEL_TIMER HANDOVER_CONFIRM; LEDGER rentRelease; NOTIFY OWNER; SYSTEM_MESSAGE RECEIVED |
| PAID | REPORT_NOT_RECEIVED{note} (арендатор) | владелец отметил «Передал» | DISPUTED (NOT_HANDED_OVER) | CANCEL_TIMER HANDOVER_CONFIRM; NOTIFY ADMINS и OWNER; SYSTEM_MESSAGE DISPUTE_OPENED |
| PAID | CANCEL{reason} (любая сторона) | владелец **ещё не** отметил «Передал» (Review Focus 3) | CANCELLED | LEDGER bookingRefund; RELEASE_DATES; NOTIFY; SYSTEM_MESSAGE |
| ACTIVE | MARK_RETURNED (арендатор) | ещё не отмечено | ACTIVE | SCHEDULE RETURN_CONFIRM `now + returnConfirmHours`; NOTIFY OWNER; SYSTEM_MESSAGE RETURNED |
| ACTIVE | CONFIRM_RETURNED (владелец) или TIMEOUT RETURN_CONFIRM | для таймера: арендатор отметил «Вернул» | RETURNED | CANCEL_TIMER RETURN_CONFIRM; RELEASE_DATES; SCHEDULE INSPECTION `now + inspectionHours`; NOTIFY RENTER; SYSTEM_MESSAGE RECEIVED_BACK |
| ACTIVE | REPORT_NOT_RETURNED{note} (владелец) | арендатор отметил «Вернул» **или** `today > period.end` | DISPUTED (NOT_RETURNED) | CANCEL_TIMER RETURN_CONFIRM; NOTIFY ADMINS и RENTER; SYSTEM_MESSAGE DISPUTE_OPENED |
| RETURNED | ALL_FINE (владелец) или TIMEOUT INSPECTION | — | COMPLETED (DEPOSIT_REFUNDED) | CANCEL_TIMER INSPECTION; LEDGER depositRefund; NOTIFY RENTER; SYSTEM_MESSAGE ALL_FINE |
| RETURNED | REPORT_DAMAGE{description 10–2000 симв., photoIds 1–8} (владелец) | — | DAMAGE_CLAIMED | CANCEL_TIMER INSPECTION; SCHEDULE DAMAGE_REPLY `now + damageReplyHours`; NOTIFY RENTER; SYSTEM_MESSAGE DAMAGE_REPORTED |
| DAMAGE_CLAIMED | ACCEPT_DAMAGE (арендатор) | — | COMPLETED (DEPOSIT_TO_OWNER) | CANCEL_TIMER; LEDGER depositToOwner; NOTIFY OWNER; SYSTEM_MESSAGE DAMAGE_ACCEPTED |
| DAMAGE_CLAIMED | REJECT_DAMAGE{note} (арендатор) или TIMEOUT DAMAGE_REPLY | — | DISPUTED (DAMAGE) | CANCEL_TIMER; NOTIFY ADMINS и OWNER; SYSTEM_MESSAGE DISPUTE_OPENED |
| DISPUTED (DAMAGE, NOT_RETURNED) | RESOLVE{REFUND_DEPOSIT или DEPOSIT_TO_OWNER, comment} (админ) | comment 1–2000 | COMPLETED | LEDGER depositRefund или depositToOwner; RELEASE_DATES (если NOT_RETURNED); NOTIFY обоим; SYSTEM_MESSAGE DISPUTE_RESOLVED |
| DISPUTED (NOT_HANDED_OVER) | RESOLVE{REFUND_ALL, comment} (админ) | — | CANCELLED (by ADMIN, outcome REFUNDED_ALL) | LEDGER bookingRefund; RELEASE_DATES; NOTIFY обоим; SYSTEM_MESSAGE DISPUTE_RESOLVED |
| DISPUTED (NOT_HANDED_OVER) | RESOLVE{CONFIRM_HANDOVER, comment} (админ) | — | ACTIVE | LEDGER rentRelease; NOTIFY обоим; SYSTEM_MESSAGE DISPUTE_RESOLVED |

**Правила для всех строк:**
- **Таймеры.** `SCHEDULE` и `CANCEL_TIMER` обновляют `next.timers`. `TIMEOUT` для таймера, который не взведён или срок которого ещё не наступил, ничего не меняет: `next === snapshot`, `effects = []`, ошибки нет. Так фоновая задача может сработать поздно или дважды без вреда (Review Focus 2).
- **Залог 0.** Проводок с залогом нет, но переходы те же.
- **Неизменяемость.** `next` — новый объект, `snapshot` не меняется. `updatedAt` = `now`; при COMPLETED заполняется `completedAt`.

- [ ] **Step 1: Write the failing tests**

```ts
// таблица: для каждой строки — состояние, актёр, событие → ожидаемый status, outcome, виды эффектов и операции журнала
// исчерпывающий отказ: для каждого status × каждого вида актёра × каждого type события, которого нет в таблице → TRANSITION_NOT_ALLOWED (или NOT_A_PARTY)
const paid = given('PAID');                                   // помощник теста строит снимок через createRequest → ACCEPT → SIGN×2 → PAY
const handed = decide(paid, owner, { type: 'MARK_HANDED_OVER' }, ctx).next;
expect(() => decide(handed, renter, { type: 'CANCEL', reason: 'changed my mind' }, ctx)).toThrow(expect.objectContaining({ code: 'TRANSITION_NOT_ALLOWED' }));   // Review Focus 3
const done = decide(given('RETURNED'), owner, { type: 'ALL_FINE' }, ctx);
expect(decide(done.next, system, { type: 'TIMEOUT', timer: 'INSPECTION' }, later(ctx, 49))).toEqual({ next: done.next, effects: [] });         // Review Focus 2
const early = decide(given('RETURNED'), system, { type: 'TIMEOUT', timer: 'INSPECTION' }, later(ctx, 47));
expect(early.effects).toEqual([]);                                                                                                          // ещё рано
expect(createRequest(nightOfStartDayRequest, ctx).next.timers.REQUEST_EXPIRY).toEqual(endOfDayIn(start, 'Europe/Riga'));                     // ttl ограничен концом первого дня
expect(() => decide(given('ACCEPTED', { renterSigned: true }), renter, { type: 'PAY', method: 'CARD' }, ctx)).toThrow(expect.objectContaining({ code: 'CONTRACT_NOT_SIGNED' }));
expect(() => decide(given('REQUESTED'), stranger, { type: 'ACCEPT' }, ctx)).toThrow(expect.objectContaining({ code: 'NOT_A_PARTY' }));
```

- [ ] **Step 2–4:** RED → реализация → GREEN. Таблица в коде — одна структура данных, из которой берут и `decide`, и `availableActions` (Task 6), а не разрозненные `if`.
- [ ] **Step 5: Commit.** `feat(domain): booking state machine with deposit rule, cancellations, disputes and timers`.

---

### Task 6: Сохранение денег, доступные действия, окно отзывов, документация

**Files:** Create `src/booking/actions.ts`, `src/reviews.ts`, `src/booking/conservation.test.ts`, `packages/domain/README.md`. Test: `src/booking/actions.test.ts`, `src/reviews.test.ts`.

**Interfaces:**
- Produces:
  - `availableActions(snapshot, actor, ctx): BookingEvent['type'][]` — события, которые `decide` примет от этого актёра сейчас (с допустимыми данными). Сайт покажет по ним кнопки.
  - `canReview(snapshot, now, settings): boolean` — `COMPLETED` и `now ≤ completedAt + reviewWindowDays`.

- [ ] **Step 1: Write the failing tests**

```ts
// conservation.test.ts (Review Focus 1), fast-check, ≥ 500 прогонов:
// случайная цена и залог (в т.ч. 0), способ оплаты, затем случайная цепочка: на каждом шаге — случайное событие из
// availableActions для случайной стороны, либо TIMEOUT по случайному взведённому таймеру со сдвигом часов вперёд.
// После каждого шага: каждая операция сбалансирована; applyOperation не бросает; кошельки ≥ 0.
// В конечном состоянии: escrow:<id> = 0, deposit:<id> = 0;
// platform:revenue = fee, если outcome не REFUNDED_ALL и сделка не была отменена после оплаты, иначе 0.
// actions.test.ts: для каждого состояния и актёра каждое действие из списка проходит decide, а любое другое — нет.
// reviews.test.ts: COMPLETED + 14 дней — можно; + 14 дней + 1 мс — нельзя; не COMPLETED — нельзя.
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: README.** Диаграмма состояний (mermaid `stateDiagram-v2`) и таблица переходов из Task 5. Пример «оплата 3 дней по 15 € с залогом 100 €» с проводками на каждом шаге.
- [ ] **Step 6: Run the gate.** `pnpm turbo run lint typecheck test build`. Expected: зелёный, включая остальные пакеты.
- [ ] **Step 7: Commit.** `feat(domain): available actions, review window, money-conservation properties and docs`.

---

## Self-Review (выполнено при написании)

- **Покрытие спецификации:**
  - §4.4 (шаги 1–7, отмена, «вещь не вернули», занятость): Task 5. Блокировку дат на уровне базы делает план 8 (exclusion constraint); ядро даёт эффекты `RESERVE_DATES` и `RELEASE_DATES` и проверку `blocked`.
  - §4.4, шаг 8 (окно отзывов): Task 6.
  - §4.5 (проводки, баланс из журнала, сбор на счёте Yoyo): Task 4.
  - §4.6 («предложить цену»): `validateOffer` и `agreedDailyCents` в Task 3.
  - §0 (возврат тем же способом, провайдер платежей позже): `PaymentMethod` и `bookingRefund`.
- **Мои решения, которых нет в спецификации:**
  - срок оплаты 24 ч;
  - «Получил» от арендатора само подтверждает передачу;
  - 48 ч на подтверждение передачи и возврата с автоподтверждением;
  - спор «не получил»;
  - договорная цена без недельной скидки;
  - даты освобождаются при возврате вещи.
  Все они помечены в тексте. Исполнитель записывает в ruling всё, что меняет.
- **Согласованность имён:** `Cents`, `LocalDate`, `Period`, `Quote`, `LedgerOperation`, `BookingSnapshot`, `Decision`, `DecideContext`, `TimerKind`, `BookingTemplate` одинаковы во всех задачах.
