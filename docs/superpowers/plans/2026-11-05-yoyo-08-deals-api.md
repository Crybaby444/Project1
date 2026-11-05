# Yoyo — План 8: Сделка и кошелёк, API. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Серверная часть сделки и кошелька на ядре из плана 4:
- запрос брони на объявление с расчётом цены из `@yoyo/domain` (недельная скидка, сервисный сбор, предложение своей цены);
- автомат сделки и журнал проводок из ядра, сохранённые в базе: сделки, проводки, кошельки, escrow, залоги;
- двойная бронь невозможна на уровне базы: ограничение-исключение PostgreSQL по диапазону дат вещи;
- оплата-имитация за интерфейсом `PaymentProvider`: тестовая «карта», которая ведёт себя как настоящая, пополнение кошелька и вывод на карту. Позже сюда подключается Stripe Connect;
- передача, возврат, проверка и правило залога, отмены, споры с решением администратора, тайм-ауты 48 часов;
- таймеры, которые работают на бесплатном Render, хотя он засыпает;
- договор аренды в PDF на EN, LV и RU;
- письма о каждом событии сделки на EN, LV и RU;
- ключи идемпотентности на POST-запросах, которые двигают деньги, и оптимистичная блокировка сделок;
- админские эндпоинты чтения сделок и журнала; OpenAPI и сгенерированный клиент.

Экраны (страница сделки, кошелёк, экран оплаты) — отдельный план. Чат и уведомления на сайте — план 9: системные сообщения сделки здесь только записываются в журнал событий.

**Architecture:** новые модули NestJS `ledger`, `payments`, `wallet`, `bookings`, `offers`, `timers`, `contracts`, `idempotency`, `admin-deals`.
- **Functional core, imperative shell.** Каждое действие со сделкой — одна транзакция:
  1. строка сделки блокируется (`SELECT … FOR UPDATE`);
  2. сверяется `version` из запроса;
  3. снимок из базы отдаётся в `decide()`;
  4. сохраняются `next` (с `version + 1`), журнал событий и все эффекты.
  
  Своих правил переходов в API нет.
- **Журнал проводок.** Строка `LedgerOperation` и её проводки `LedgerEntry` неизменяемы. Баланс счёта — сумма проводок, а в `LedgerAccount` лежит его кэш, который обновляется в той же транзакции. База сама следит за балансом: отложенный триггер проверяет при коммите, что сумма проводок операции равна нулю; `CHECK` не пускает кошелёк, escrow и залог ниже нуля; триггер запрещает `UPDATE` и `DELETE` проводок.
- **Двойная бронь.** У сделки есть колонка `reserved daterange`: её заполняет эффект `RESERVE_DATES` и очищает `RELEASE_DATES`. На таблице стоит `EXCLUDE USING gist ("listingId" WITH =, reserved WITH &&)` (`btree_gist`). Код тоже проверяет даты (`ctx.blocked`), но гонку двух `ACCEPT` ловит база: ошибка `23P01` превращается в `409 DATES_UNAVAILABLE`.
- **Таймеры.** У сделки взведено не больше одного таймера (правило ядра), он хранится в колонках `timerKind` и `timerDueAt`. `TimersService.runDue()` берёт просроченные сделки по одной (`FOR UPDATE SKIP LOCKED`) и отдаёт ядру `TIMEOUT`. Ядро игнорирует поздний, повторный и ранний `TIMEOUT`, поэтому запуск дважды безопасен. Запуск идёт при старте API, без ожидания, и через защищённый `POST /internal/timers/run`, который каждые 10 минут вызывает GitHub Actions по секрету.
- **Деньги наружу.** Списание с карты идёт до транзакции; если транзакция не прошла, деньги возвращаются. Возврат на карту и выплата записываются в транзакции как задания (`PaymentRefund`, `Payout` со статусом `PENDING`) и выполняются после коммита. Невыполненные задания повторяет тот же `runDue()`, ключ идемпотентности у провайдера — id задания.

**Tech Stack:**
- уже есть: NestJS 11, Prisma 7, zod, `@yoyo/domain`, `@yoyo/shared`, react-email, `MailService`;
- новое:
  - `pdf-lib` и `@pdf-lib/fontkit` — чистый JS, без скриптов установки, договор в PDF;
  - шрифт Liberation Sans (SIL OFL 1.1) в `apps/api/assets/fonts` — латышские буквы и кириллица;
  - `fast-check` (devDependency API) для свойства по сохранённому потоку;
- PostgreSQL: расширение `btree_gist`, тип `daterange`, ограничение-исключение, триггеры.

**Spec:** [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md):
- §0 — оплата-имитация за интерфейсом провайдера, никаких демо-подпорок, тайм-ауты проверяются тестами с подменой часов;
- §4.4 — сделка, правило залога, отмена, занятость;
- §4.5 — кошелёк;
- §4.6 — «предложить свою цену» (данные и API; кнопка в чате — план 9);
- §4.7 — письма;
- §5 — безопасность;
- §6 — `Booking`, `BookingEvent`, `Contract`, `HandoverPhoto`, `Dispute`, `Wallet`, `LedgerEntry`, `Payout`, `Offer`.

Ядро и его таблица переходов описаны в [`packages/domain/README.md`](../../../packages/domain/README.md). Зависит от слитых планов 3, 4 и 6.

## Global Constraints

**Общие**
- Действуют правила планов 1, 3, 4 и 6: TypeScript strict, ошибки `{ error: { code, message, fields?, details? } }`, `AuthGuard`, `@CurrentUser()`, `RolesGuard`, `Clock`, проверка Origin, три языка, политика pnpm.
- **Правила только в ядре.** Статус, таймеры, условия и деньги определяет `createRequest`, `decide` и `availableActions` из `@yoyo/domain`. API хранит, блокирует, выполняет эффекты и переводит ошибки.

**Деньги**
- Целые центы EUR везде: в базе (`Int`), в JSON, в письмах и PDF. Дробных денег нет.
- Каждая операция журнала сбалансирована. Это проверяют ядро (`assertBalanced`), API перед записью и база при коммите.
- Кошелёк, escrow и залог не уходят ниже нуля (ядро `applyOperation` и `CHECK` в базе).
- Номер карты не хранится и не пишется в лог. Хранятся только марка, последние 4 цифры и ссылка провайдера.

**Доступ**
- Сделку видят только её стороны и администратор. Для остальных её нет: `404 NOT_FOUND` на любое действие.
- Администратор только читает и решает споры (`RESOLVE`). Действовать за стороны он не может (так решило ядро).
- **Заблокированный или удалённый владелец:** на его вещь нельзя отправить запрос или предложение цены, его бронь нельзя оплатить. Ответ `409 LISTING_UNAVAILABLE`. Это ревью PR #3.
- Запрос возможен только на опубликованную (`PUBLISHED`) вещь.

**Конкурентность**
- **Оптимистичная блокировка.** Каждое действие со сделкой несёт `version`. Устаревший — `409 INVALID_STATUS` с `details.currentVersion`, как у объявлений.
- **Ключ идемпотентности.** Заголовок `Idempotency-Key` (8–100 символов `[A-Za-z0-9_-]`) обязателен на:
  - `POST /bookings/:id/events`;
  - `POST /wallet/top-ups`;
  - `POST /wallet/payouts`;
  - `POST /admin/bookings/:id/resolve`.
  
  На `POST /bookings` и `POST /listings/:id/offers` он необязателен, но учитывается. Повтор с тем же ключом и тем же телом возвращает сохранённый ответ (`Idempotent-Replayed: true`). Другое тело с тем же ключом — `409 IDEMPOTENCY_KEY_REUSED`. Пока первый запрос не закончился — `409 IDEMPOTENCY_IN_PROGRESS`. Ошибка ключ не занимает: можно повторить. Ключи живут 24 часа и принадлежат пользователю.

**Время**
- «Сейчас» — только `Clock`. Тайм-ауты проверяются тестами с `FakeClock`; перемотки времени в продукте нет (§0).

**Новые коды ошибок** (`ERROR_CODES`):
- `DATES_UNAVAILABLE`, `CANNOT_RENT_OWN`, `LISTING_UNAVAILABLE`;
- `INSUFFICIENT_FUNDS`, `PAYMENT_DECLINED`, `CONTRACT_NOT_SIGNED`;
- `ACTION_NOT_ALLOWED`, `DEADLINE_PASSED`;
- `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_PROGRESS`, `IDEMPOTENCY_KEY_REQUIRED`;
- `OFFER_UNAVAILABLE`, `WALLET_LIMIT`.

**Перевод `DomainError` в HTTP** (`domain-errors.ts`, одна таблица):

| Код ядра | HTTP |
|---|---|
| `START_IN_PAST`, `TOO_FAR_AHEAD`, `PERIOD_TOO_SHORT`, `PERIOD_TOO_LONG`, `INVALID_PERIOD`, `INVALID_DATE`, `INVALID_OFFER`, `INVALID_INPUT`, `INVALID_AMOUNT` | `400 VALIDATION_FAILED`, `fields` по полю, `details.reason` = код ядра |
| `DATES_UNAVAILABLE` | `409 DATES_UNAVAILABLE`, `details.conflict` |
| `CANNOT_RENT_OWN` | `409 CANNOT_RENT_OWN` |
| `INSUFFICIENT_FUNDS` | `409 INSUFFICIENT_FUNDS`, `details.shortfallCents` |
| `CONTRACT_NOT_SIGNED` | `409 CONTRACT_NOT_SIGNED` |
| `TRANSITION_NOT_ALLOWED` | `409 ACTION_NOT_ALLOWED`, `details.why`; с `details.overdueTimer` — сначала выполнить этот TIMEOUT, затем `409 DEADLINE_PASSED` |
| `NOT_A_PARTY` | `404 NOT_FOUND` |
| `UNBALANCED_OPERATION`, `NEGATIVE_BALANCE`, `INVALID_PRICING` | `500 INTERNAL` с записью в лог: это ошибка программы, а не пользователя |

## Review Focus

1. **Двойная бронь.** Десять параллельных `ACCEPT` по пересекающимся запросам одной вещи: ровно один `200`, остальные `409 DATES_UNAVAILABLE`. В базе одна строка с `reserved`. Ограничение действует и при прямой записи SQL в обход кода. Тесты в Task 1 и Task 7.
2. **Деньги сходятся.**
   - Сумма всех проводок равна 0.
   - Кэш баланса совпадает с суммой проводок.
   - Ни один кошелёк, escrow или залог не ниже нуля.
   - У закрытой сделки escrow и залог пусты.
   - Свойство fast-check над настоящей базой: случайные сделки, действия, оплаты обоими способами и таймеры. Task 14.
3. **Чужая сделка (IDOR).** Третий пользователь читает, действует, скачивает договор, загружает фото — везде 404. Сторона не может сделать ход за другую сторону. Обычный пользователь на админских маршрутах получает 403. Task 6, 7, 11.
4. **Повтор и гонка денег.**
   - Двойной клик «Оплатить» с одним ключом: одно списание.
   - Два вывода с кошелька по 80 € при балансе 100 € параллельно: один проходит.
   - Повтор запуска таймеров параллельно: каждый таймер срабатывает один раз.
   
   Task 4, 5, 8, 10.
5. **Таймер на спящем сервере.** Endpoint без секрета или с неверным секретом — 401, без настроенного секрета — 404. Просроченный таймер побеждает опоздавшее действие стороны: оно получает `409 DEADLINE_PASSED`, а сделка уже в новом статусе. Task 10.
6. **Заблокированный владелец.** Запрос, предложение цены и оплата на вещь заблокированного владельца отклоняются. Task 6, 8.

---

## Структура файлов (итог плана)

```
packages/shared/src/{bookings.ts,wallet.ts,offers.ts}      zod-схемы запросов и ответов, статусы, лимиты
apps/api/prisma/schema.prisma (+ migration deals, SQL: btree_gist, EXCLUDE, триггеры журнала)
apps/api/src/ledger/{ledger.module,ledger.service,accounts}.ts
apps/api/src/payments/{payments.module,payment.provider,fake-card.provider,payments.controller,money-out.service}.ts
apps/api/src/idempotency/{idempotency.module,idempotency.interceptor,idempotent.decorator}.ts
apps/api/src/wallet/{wallet.module,wallet.controller,wallet.service}.ts
apps/api/src/offers/{offers.module,offers.controller,offers.service}.ts
apps/api/src/bookings/{bookings.module,bookings.controller,bookings.service,booking.store,booking.serializer,effects.executor,domain-errors,booking-settings,booking-photos.service}.ts
apps/api/src/timers/{timers.module,timers.controller,timers.service}.ts
apps/api/src/contracts/{contracts.module,contract.service,contract.pdf,contract-texts}.ts + assets/fonts/LiberationSans-{Regular,Bold}.ttf, OFL.txt
apps/api/src/admin-deals/{admin-deals.module,admin-deals.controller,admin-deals.service}.ts
apps/api/src/mail/templates/DealEvent.tsx, mail/i18n/{en,lv,ru}.json (раздел deal)
.github/workflows/timers.yml
apps/api/test/{deals-schema,ledger,payments,idempotency,wallet,offers,bookings.request,bookings.flow,bookings.race,booking-photos,timers,disputes,admin-deals,contract,deal-mail,ledger.property}.e2e.test.ts
apps/api/test/support/deals.ts
```

---

### Task 1: Таблицы сделок и журнала с защитой в базе

**Files:**
- Modify: `schema.prisma`; migration `deals` (одна на план, плюс ручной SQL в ней же).
- Test: `apps/api/test/deals-schema.test.ts`.

**Interfaces:**
- **Перечисления:** `BookingStatus`, `TimerKind`, `PaymentMethod` (`WALLET | CARD`), `LedgerKind` (= `OperationKind` ядра), `OfferStatus` (`PENDING | ACCEPTED | DECLINED | WITHDRAWN | EXPIRED | USED`), `BookingPhotoKind` (`HANDOVER | RETURN | DAMAGE`), `MoneyJobStatus` (`PENDING | DONE | FAILED`).
- **`Booking`** — снимок ядра в колонках:
  - стороны и вещь: `id, listingId, renterId, ownerId, offerId?`;
  - статус и даты: `status, start Date, end Date, timeZone`;
  - цена (все `Int`): `days, dailyCents, baseCents, discountPercent, discountCents, rentCents, serviceFeeCents, depositCents, totalCents, ownerPayoutCents, priceSource`;
  - подписи и отметки: `renterSignedAt?, ownerSignedAt?, paymentMethod?, ownerHandedOverAt?, renterReceivedAt?, renterReturnedAt?, ownerReceivedBackAt?`;
  - отказ, повреждение и спор: `declineReason?, damageDescription?, damagePhotoIds String[], damageClaimedAt?, disputeReason?, disputeOpenedAt?, disputeNote?, resolutionDecision?, resolutionComment?, resolvedById?, resolvedAt?`;
  - отмена и итог: `cancelledBy?, cancelReason?, cancelledAt?, outcome?`;
  - таймер и прочее: `timerKind?, timerDueAt?, message?` (текст запроса, 0–1000), `reserved daterange?` (`Unsupported`), `version Int`, `createdAt, updatedAt, completedAt?`;
  - индексы `(renterId, updatedAt)`, `(ownerId, updatedAt)`, `(listingId)`, `(timerDueAt)`, `(status)`.
- **`BookingEvent`** — журнал: `id, bookingId, type, actorKind, actorId?, fromStatus?, toStatus, data Json, messages String[]` (шаблоны `SYSTEM_MESSAGE` для чата плана 9), `createdAt`.
- **`Contract`** — `bookingId @id`, `terms Json` (замороженные условия: стороны, вещь, правила, период, цена), `termsHash` (sha256), `createdAt`.
- **`BookingPhoto`** — `id, bookingId, uploaderId, kind, storageKey @unique, width, height, bytes, format, createdAt`.
- **`Offer`** — `id, listingId, renterId, ownerId, start, end, dailyCents, status, expiresAt, answeredAt?, createdAt`.
- **`LedgerOperation`** — `id, kind, bookingId?, userId?, createdAt`.
- **`LedgerEntry`** — `id BigInt autoincrement, operationId, account, amount Int`, индекс `(account, id)`.
- **`LedgerAccount`** — `id` (`wallet:<userId>` и т. п.), `balance Int`, `updatedAt`. Это кэш, он же «кошелёк» из §6.
- **`Payment`** — списание с карты: `id, userId, bookingId?, purpose (BOOKING | TOP_UP), amountCents, refundedCents, providerRef @unique, brand, last4, createdAt`.
- **`PaymentRefund`** — `id, paymentId, amountCents, status, providerRef?, attempts, lastError?, createdAt, doneAt?`.
- **`Payout`** — `id, userId, amountCents, brand, last4, destinationToken, status, providerRef?, attempts, lastError?, operationId @unique, createdAt, doneAt?`.
- **`IdempotencyKey`** — `userId, key, scope` (метод и маршрут), `requestHash, state (IN_PROGRESS | DONE), statusCode?, body Json?, createdAt`; `@@id([userId, key])`.
- **Ручной SQL в миграции:**
  - `CREATE EXTENSION IF NOT EXISTS btree_gist`;
  - `ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_double_booking" EXCLUDE USING gist ("listingId" WITH =, reserved WITH &&)`;
  - `CHECK ("end" >= "start")`, `CHECK` неотрицательных сумм брони, `CHECK (version >= 0)`;
  - `LedgerAccount_balance_floor`: `CHECK (balance >= 0 OR id IN ('external:card','platform:revenue'))`;
  - `LedgerEntry`: `CHECK (amount <> 0)`; триггер `ledger_entry_immutable` (`BEFORE UPDATE OR DELETE` → исключение);
  - `CONSTRAINT TRIGGER ledger_operation_balanced AFTER INSERT ON "LedgerEntry" DEFERRABLE INITIALLY DEFERRED` → `SUM(amount)` операции равна 0, иначе исключение при коммите.
- **Безопасность миграции на живой базе:** только новые таблицы и типы, существующие не меняются, блокировок на `User` и `Listing` нет (внешние ключи на новые таблицы).

- [ ] **Step 1: Write the failing tests** (прямой SQL через Prisma, Review Focus 1 и 2):
  - две сделки одной вещи с пересекающимся `reserved` → ошибка `23P01`; не пересекаются, другая вещь или `reserved IS NULL` → можно;
  - операция с проводками `+100` и `−99` → ошибка при коммите;
  - `UPDATE` или `DELETE` проводки → ошибка;
  - баланс кошелька `−1` → нарушение `CHECK`; баланс `external:card` `−1` → можно.
- [ ] **Step 2–4:** RED → схема и миграция → GREEN.
- [ ] **Step 5: Commit.** `feat(api): deal and ledger tables guarded by the database`.

---

### Task 2: Журнал проводок

**Files:**
- Create: `apps/api/src/ledger/*`.
- Test: `apps/api/test/ledger.e2e.test.ts`.

**Interfaces:**
- **`LedgerService.post(op: LedgerOperation, tx, meta?: { userId? }): Promise<string>`:**
  1. `assertBalanced(op)`;
  2. блокирует строки `LedgerAccount` всех счетов операции **в отсортированном порядке**, чтобы не было взаимоблокировок (`INSERT … ON CONFLICT DO NOTHING`, затем `SELECT … FOR UPDATE`);
  3. применяет ядро `applyOperation` к текущим балансам (`INSUFFICIENT_FUNDS`, `NEGATIVE_BALANCE`);
  4. пишет операцию, проводки и новые балансы.
  
  Возвращает id операции.
- **`balance(account, tx?)`** — из кэша.
- **`audit()`** — для тестов и админа:
  - `{ sumOfAll, mismatched: { account, cached, fromEntries }[], unbalancedOperations: string[], negative: string[] }`;
  - всё должно быть пустым и `0`.
- **`walletHistory(userId, { page, kind? })`** — проводки по `wallet:<userId>`, новые первыми, со ссылкой на сделку.

- [ ] **Step 1: Write the failing tests:**
  - пополнение и вывод меняют баланс;
  - вывод больше баланса → `INSUFFICIENT_FUNDS`, ничего не записано;
  - 20 параллельных списаний по 10 € с кошелька на 100 € → ровно 10 прошли;
  - `audit()` чистый после всего.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): double-entry ledger with locked balances and an audit`.

---

### Task 3: Провайдер оплаты и тестовая карта

**Files:**
- Create: `apps/api/src/payments/{payments.module,payment.provider,fake-card.provider,payments.controller}.ts`, `packages/shared/src/wallet.ts` (схемы карты).
- Modify: `env.ts` (`PAYMENTS`), `app.module.ts`.
- Test: `apps/api/src/payments/fake-card.provider.test.ts`, `apps/api/test/payments.e2e.test.ts`.

**Interfaces:**
- **`interface PaymentProvider`** (токен `PAYMENT_PROVIDER`):
  - `tokenize(card)`: `card = { number, expMonth, expYear, cvc, holder }` → `{ token, brand, last4, expMonth, expYear }`. У Stripe это делает Stripe.js в браузере; номер в нашу базу не попадает;
  - `charge({ token, amountCents, idempotencyKey, description })` → `{ status: 'SUCCEEDED', ref, brand, last4 }` или `{ status: 'DECLINED', declineCode }`;
  - `refund({ paymentRef, amountCents, idempotencyKey })` → `{ ref }`;
  - `payout({ token, amountCents, idempotencyKey })` → `{ ref }`.
- **`FakeCardProvider`** ведёт себя как настоящий:
  - проверяет номер по Луну, срок (не в прошлом по `Clock`) и CVC (3 цифры, у Amex 4);
  - определяет марку (Visa, Mastercard, Amex);
  - токен `tok_…` подписан HMAC (ключ из `JWT_SECRET` с меткой `payments`), живёт 15 минут и номера не содержит — только марку, last4 и результат;
  - тестовые номера по образцу Stripe:
    - `4242 4242 4242 4242` и `5555 5555 5555 4444` — проходят;
    - `4000 0000 0000 0002` — `card_declined`;
    - `4000 0000 0000 9995` — `insufficient_funds`;
    - `4000 0000 0000 0069` — `expired_card`;
    - `4000 0000 0000 0119` — `processing_error`;
  - повтор `charge` с тем же `idempotencyKey` возвращает тот же `ref` (память процесса, как кэш у Stripe).
- **`POST /payments/card-tokens`** (вход обязателен, 20 в час на пользователя) → `201 { token, brand, last4, expMonth, expYear }`. Неверный номер, срок или CVC → `400` с `fields`.
- Env `PAYMENTS=fake` (единственный вариант сейчас, по умолчанию). Для Stripe позже — новый класс за тем же интерфейсом.

- [ ] **Step 1: Write the failing tests:**
  - Лун, срок и CVC;
  - каждый тестовый номер даёт свой результат;
  - подделанный или просроченный токен → `DECLINED invalid_token`;
  - повтор с тем же ключом → тот же `ref`;
  - в ответе и логе нет полного номера.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): payment provider interface with a test card provider`.

---

### Task 4: Ключи идемпотентности

**Files:**
- Create: `apps/api/src/idempotency/*`.
- Test: `apps/api/test/idempotency.e2e.test.ts` (тестовый контроллер).

**Interfaces:**
- **`@Idempotent({ required: boolean })`** и `IdempotencyInterceptor` (после `AuthGuard`):
  - `requestHash = sha256(method + route + canonical JSON body)`;
  - вставка строки `IN_PROGRESS`; уникальный ключ уже есть →
    - `DONE` и тот же хэш → сохранённый статус и тело, заголовок `Idempotent-Replayed: true`;
    - `IN_PROGRESS` → `409 IDEMPOTENCY_IN_PROGRESS`;
    - другой хэш → `409 IDEMPOTENCY_KEY_REUSED`;
  - успех → `DONE` со статусом и телом; ошибка → строка удаляется;
  - нет заголовка при `required` → `400 IDEMPOTENCY_KEY_REQUIRED`.
- Строки старше 24 часов удаляет `runDue()` (Task 10).

- [ ] **Step 1: Write the failing tests:**
  - повтор → тот же ответ, обработчик вызван один раз;
  - параллельные одинаковые → один `200`, другой `409 IDEMPOTENCY_IN_PROGRESS` или повтор;
  - другое тело → `409`;
  - ошибка → ключ свободен;
  - ключи разных пользователей не пересекаются.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): idempotency keys for money-moving requests`.

---

### Task 5: Кошелёк: баланс, история, пополнение, вывод

**Files:**
- Create: `apps/api/src/wallet/*`, `apps/api/src/payments/money-out.service.ts`.
- Modify: `packages/shared/src/wallet.ts`, `rate-limits.ts`.
- Test: `apps/api/test/wallet.e2e.test.ts`.

**Interfaces:**
- **`GET /wallet`** → `{ balanceCents, heldCents }`. `heldCents` — сумма залогов и escrow сделок, где пользователь — арендатор и платил кошельком (для экрана «заморожено»).
- **`GET /wallet/transactions?page=&kind=`** → `{ items: { id, kind, amountCents, bookingId?, createdAt }[], total }`, 20 на страницу.
- **`POST /wallet/top-ups`** `{ amountCents, cardToken }`, Idempotency-Key обязателен:
  - лимиты: от 100 до 50 000 центов за раз, баланс после — не больше 500 000 (`409 WALLET_LIMIT`), 10 в час;
  - `charge` → в транзакции `TOP_UP` и `Payment`; если транзакция упала, `refund`;
  - отказ карты → `402 PAYMENT_DECLINED` с `details.declineCode`.
- **`POST /wallet/payouts`** `{ amountCents, cardToken }`, Idempotency-Key обязателен:
  - в транзакции `WITHDRAWAL` (баланс проверяет журнал) и `Payout PENDING`;
  - после коммита `MoneyOutService.process()` вызывает `provider.payout`; ответ `{ payout: { id, status, amountCents, brand, last4 } }`;
  - 10 в час.
- **`MoneyOutService.processPending()`** выполняет `PENDING` возвраты и выплаты (ключ провайдера = id задания), считает попытки. После 10 неудач — `FAILED` и запись в лог для администратора.

- [ ] **Step 1: Write the failing tests:**
  - пополнение картой 4242 → баланс, история;
  - карта 0002 → 402, баланс тот же;
  - повтор с тем же ключом → одно списание (Review Focus 4);
  - два параллельных вывода по 80 € из 100 € → один `201`, другой `409 INSUFFICIENT_FUNDS`;
  - вывод → `Payout DONE`;
  - лимиты;
  - `audit()` чистый.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): wallet balance, history, card top-ups and payouts`.

---

### Task 6: Цена, предложения цены и запрос брони

**Files:**
- Create: `packages/shared/src/{bookings,offers}.ts`, `apps/api/src/offers/*`, `apps/api/src/bookings/{bookings.module,bookings.controller,bookings.service,booking.store,booking.serializer,domain-errors,booking-settings}.ts`.
- Modify: `packages/shared/src/settings.ts` (недостающие ключи `BookingSettings`), `settings.service.ts`, `rate-limits.ts`.
- Test: `apps/api/test/offers.e2e.test.ts`, `apps/api/test/bookings.request.e2e.test.ts`, `booking-settings.test.ts`, `domain-errors.test.ts`.

**Interfaces:**
- **`bookingSettings()`** — `DEFAULT_BOOKING_SETTINGS`, поверх значения из таблицы `Setting`, затем `validateBookingSettings`. Неверное сохранённое значение — значение по умолчанию и запись в лог.
- **`GET /listings/:id/quote?start=&end=&offerId=`** (публично, только `PUBLISHED`) → `{ quote, blocked: Period[] }`. Цену считает ядро `quote`.
- **Предложение цены** (§4.6):
  - `POST /listings/:id/offers` `{ start, end, dailyCents }` (арендатор, 20 в день): `validateOffer` ядра, не своя вещь, вещь `PUBLISHED`, владелец не заблокирован; живёт 24 часа (`expiresAt`);
  - `POST /offers/:id/accept`, `POST /offers/:id/decline` (владелец), `POST /offers/:id/withdraw` (арендатор);
  - `GET /me/offers?role=renter|owner`;
  - принятое предложение действует до конца первого дня периода и используется один раз (`USED` в транзакции запроса брони);
  - письма `OFFER_MADE` владельцу и `OFFER_ANSWERED` арендатору (Task 13).
- **`POST /bookings`** `{ listingId, start, end, offerId?, message? }` (20 в час на пользователя):
  1. вещь `PUBLISHED`, владелец не заблокирован и не удалён (`409 LISTING_UNAVAILABLE`);
  2. `blocked` — занятые периоды других сделок (`reserved`) и закрытые владельцем дни;
  3. `createRequest()` ядра (`CANNOT_RENT_OWN`, даты, длина, `DATES_UNAVAILABLE`);
  4. сохранение `Booking`, `BookingEvent REQUESTED`, письмо владельцу.
  
  Ответ `201 { booking }`.
- **`GET /bookings/:id`** → `{ booking }`, только сторонам и администратору.
- **`GET /me/bookings?role=renter|owner&status=&page=`** → `{ items, total }`.
- **`BookingView`:**
  - id, status, роль зрителя, вещь (id, заголовок, обложка, район);
  - стороны (id, имя);
  - период, `quote`, подписи, отметки, повреждение, спор, отмена, итог;
  - `deadline: { timer, dueAt } | null`, `version`;
  - **`actions`** — `availableActions()` ядра для зрителя.
- **`booking.store.ts`:** `toSnapshot(row)` ↔ `fromSnapshot(snapshot)` без потерь. Тест: туда и обратно для снимка в каждом статусе, взятого из сценариев ядра.

- [ ] **Step 1: Write the failing tests:**
  - запрос на 8 дней по 15 € со скидкой 10 % → цена как у ядра (`rent` 108,00 €, сбор 10,80 €);
  - запрос по принятому предложению → `priceSource AGREED`, предложение `USED`, второй раз → `409 OFFER_UNAVAILABLE`;
  - своя вещь → `409 CANNOT_RENT_OWN`;
  - даты в прошлом → `400`;
  - `HIDDEN` вещь → `409 LISTING_UNAVAILABLE`;
  - **заблокированный владелец** → `409 LISTING_UNAVAILABLE` (Review Focus 6);
  - третий пользователь → 404 (Review Focus 3);
  - `actions` у владельца `['ACCEPT','DECLINE']`, у арендатора `['WITHDRAW']`.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): quotes, price offers and booking requests on the domain core`.

---

### Task 7: Действия со сделкой без денег и занятие дат

**Files:**
- Create: `apps/api/src/bookings/effects.executor.ts`, `apps/api/test/support/deals.ts`.
- Modify: `bookings.service.ts`, `bookings.controller.ts`.
- Test: `apps/api/test/bookings.flow.e2e.test.ts`, `apps/api/test/bookings.race.e2e.test.ts`.

**Interfaces:**
- **`POST /bookings/:id/events`** `{ version, event }`, Idempotency-Key обязателен. `event` — дискриминированное объединение по `type`, как `BookingEvent` ядра, без `TIMEOUT` и `RESOLVE`; для `PAY` с картой есть ещё `cardToken`. Ответ `{ booking }`.
- **`BookingsService.act(id, user, version, event)`** — одна транзакция:
  1. `SELECT … FOR UPDATE`;
  2. 404, если пользователь не сторона;
  3. `version` устарел → 409;
  4. актёр — `RENTER` или `OWNER` по строке;
  5. `ctx`: `now`, `settings`, `blocked` (только для `ACCEPT`), `walletAvailableCents` (только для `PAY WALLET`);
  6. `decide()`;
  7. сохранение `next` (`version + 1`), `BookingEvent` и эффекты в порядке ядра.
- **`EffectsExecutor`:**
  - `RESERVE_DATES` → `reserved = daterange(start, end, '[]')`; `23P01` → `409 DATES_UNAVAILABLE` (Review Focus 1);
  - `RELEASE_DATES` → `reserved = NULL`;
  - `SCHEDULE` и `CANCEL_TIMER` → колонки таймера уже в снимке, проверяется, что они совпадают;
  - `GENERATE_CONTRACT` → строка `Contract` с замороженными условиями (PDF — Task 12);
  - `LEDGER` → `LedgerService.post` (Task 8);
  - `NOTIFY` → список писем, отправка после коммита (Task 13);
  - `SYSTEM_MESSAGE` → `BookingEvent.messages`.
- **Просроченный таймер.** `TRANSITION_NOT_ALLOWED` с `details.overdueTimer` → в той же транзакции `decide(SYSTEM, TIMEOUT)` и сохранение, затем `409 DEADLINE_PASSED` с `details.status`.

- [ ] **Step 1: Write the failing tests:**
  - `ACCEPT` → `ACCEPTED`, `reserved` заполнен, есть договор;
  - `DECLINE`, `WITHDRAW` и `CANCEL` до оплаты → даты свободны;
  - `SIGN` обеими сторонами;
  - устаревший `version` → 409;
  - чужой ход (арендатор шлёт `ACCEPT`) → `409 ACTION_NOT_ALLOWED`;
  - третий → 404;
  - после срока запроса `ACCEPT` → `409 DEADLINE_PASSED` и сделка `EXPIRED`;
  - **гонка** (Review Focus 1): 10 запросов на пересекающиеся даты, затем 10 параллельных `ACCEPT` → один `200`, девять `409 DATES_UNAVAILABLE`, в базе одна сделка с `reserved`.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): booking actions on the state machine with dates reserved by an exclusion constraint`.

---

### Task 8: Оплата, передача, возврат, проверка, залог, отмена с возвратом

**Files:**
- Modify: `bookings.service.ts`, `effects.executor.ts`, `money-out.service.ts`.
- Test: дополнить `bookings.flow.e2e.test.ts`.

**Interfaces:**
- **`PAY WALLET`:** `walletAvailableCents` берётся из заблокированной строки `LedgerAccount`; `LEDGER bookingPayment` идёт в той же транзакции.
- **`PAY CARD`** `{ cardToken }`:
  1. предварительный `decide()` без записи (условия, подписи);
  2. `provider.charge` с ключом `booking:<id>:v<version>`; отказ → `402 PAYMENT_DECLINED`, сделка не меняется;
  3. транзакция: заново `decide()`, `Payment(BOOKING)`, проводки;
  4. если транзакция упала (сделка изменилась) — `refund` и ошибка клиенту.
- **Владелец заблокирован или удалён** к моменту оплаты → `409 LISTING_UNAVAILABLE` до списания (Review Focus 6).
- **Возврат на карту.** Проводка `BOOKING_REFUND` или `DEPOSIT_REFUND` на `external:card` по сделке, оплаченной картой → `PaymentRefund PENDING` в той же транзакции, после коммита `MoneyOutService.processPending()`. `Payment.refundedCents` никогда не больше `amountCents` (`CHECK`).
- Правило залога, отмены и тайм-ауты полностью из ядра.

- [ ] **Step 1: Write the failing tests** — три концовки примера из README ядра (3 дня по 15 €, залог 100 €), картой и кошельком:
  - «всё в порядке»: арендатор потратил 49,50 €, владелец получил 45,00 €, Yoyo — 4,50 €;
  - повреждение признано: владелец 145,00 €;
  - отмена владельцем до «Передал»: всё вернулось, `PaymentRefund DONE` на 149,50 €;
  - отказ карты → 402 и `ACCEPTED`;
  - не хватает в кошельке → `409 INSUFFICIENT_FUNDS`;
  - двойной клик «Оплатить» с одним ключом → одно списание (Review Focus 4);
  - отклонение повреждения → `DISPUTED`;
  - после каждого теста `audit()` чистый.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): payment, handover, return, inspection and the deposit rule with refunds the way the renter paid`.

---

### Task 9: Фото при передаче, возврате и повреждении

**Files:**
- Create: `apps/api/src/bookings/booking-photos.service.ts`.
- Modify: `bookings.controller.ts`.
- Test: `apps/api/test/booking-photos.e2e.test.ts`.

**Interfaces:**
- **`POST /bookings/:id/photos?kind=HANDOVER|RETURN|DAMAGE`** — multipart, поле `file`, те же проверки и обработка, что у фото объявлений (`checkImage`, `StorageProvider`, 10 МБ, без EXIF). Не больше 8 фото каждого вида на сделку.
  - `HANDOVER` — владелец, в `PAID` или `ACTIVE`;
  - `RETURN` — любая сторона, в `ACTIVE` или `RETURNED`;
  - `DAMAGE` — владелец, в `RETURNED`.
- **`GET /bookings/:id/photos`** → фото с адресами вариантов.
- `REPORT_DAMAGE.photoIds` должны быть фото `DAMAGE` этой сделки, иначе `400` с `fields.photoIds`.

- [ ] **Step 1: Write the failing tests:**
  - загрузка и список;
  - третий → 404;
  - арендатор грузит `DAMAGE` → `409 ACTION_NOT_ALLOWED`;
  - `REPORT_DAMAGE` с чужим id фото → 400.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): handover, return and damage photos on a booking`.

---

### Task 10: Таймеры на спящем бесплатном сервере

**Files:**
- Create: `apps/api/src/timers/*`, `.github/workflows/timers.yml`.
- Modify: `env.ts` (`TIMERS_SECRET`), `app.module.ts`.
- Test: `apps/api/test/timers.e2e.test.ts`.

**Interfaces:**
- **`TimersService.runDue({ limit = 200, budgetMs = 20_000 })`:**
  - по одной сделке: `SELECT id FROM "Booking" WHERE "timerDueAt" <= now ORDER BY "timerDueAt" FOR UPDATE SKIP LOCKED LIMIT 1`, затем `decide(SYSTEM, TIMEOUT)` и эффекты в той же транзакции;
  - ошибка одной сделки записывается в лог, обработка идёт дальше;
  - затем истекшие предложения цены (`EXPIRED`), `MoneyOutService.processPending()` и удаление ключей идемпотентности старше 24 часов;
  - ответ `{ fired, failed, offersExpired, moneyJobs, more }`.
- **При старте:** `onApplicationBootstrap` запускает `runDue()` в фоне, без ожидания и только вне тестов. Ошибка запуска не роняет API.
- **`POST /internal/timers/run`:**
  - `Authorization: Bearer <TIMERS_SECRET>`, сравнение за постоянное время;
  - без секрета в env → 404, неверный → 401;
  - вне `/api/v1`-гардов Origin (вызов без браузера).
- **`.github/workflows/timers.yml`:**
  - `schedule: cron '*/10 * * * *'` и `workflow_dispatch`;
  - `curl -fsS -X POST "$API_URL/api/v1/internal/timers/run" -H "Authorization: Bearer $TIMERS_SECRET"` с повтором (Render просыпается до минуты, `--retry 5 --retry-delay 15 --max-time 90`);
  - секреты репозитория `TIMERS_SECRET` и `API_URL`; без них задача пишет предупреждение и выходит с 0.

- [ ] **Step 1: Write the failing tests:**
  - запрос без ответа 24 часа (`FakeClock`) → `runDue` → `EXPIRED`, письма обеим сторонам;
  - `RETURNED` и 48 часов без проверки → `COMPLETED`, залог вернулся;
  - `DAMAGE_CLAIMED` и 48 часов → `DISPUTED`;
  - два `runDue` параллельно → каждый таймер сработал один раз, событие в журнале одно (Review Focus 4);
  - endpoint без и с неверным секретом → 401, без настройки → 404, с верным → 200 (Review Focus 5).
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): due timers run at startup and from a secret-protected endpoint called by a scheduled workflow`.

---

### Task 11: Споры и админские эндпоинты

**Files:**
- Create: `apps/api/src/admin-deals/*`.
- Test: `apps/api/test/disputes.e2e.test.ts`, `apps/api/test/admin-deals.e2e.test.ts`.

**Interfaces:** только `@Roles('ADMIN')`.
- **`POST /admin/bookings/:id/resolve`** `{ version, decision, comment }`, Idempotency-Key обязателен:
  - `decide(ADMIN, RESOLVE)` в транзакции;
  - администратор не решает спор по сделке, где он сам сторона (`403`).
- **`GET /admin/bookings?status=&disputed=true&page=`** → `{ items, total }`, споры — самые старые первыми, остальные — новые первыми.
- **`GET /admin/bookings/:id`** → `{ booking, events, operations, photos, payments }`.
- **`GET /admin/ledger/operations?bookingId=&account=&kind=&page=`** → операции с проводками, новые первыми.
- **`GET /admin/ledger/accounts?prefix=&page=`** → балансы.
- **`GET /admin/ledger/summary`** → `{ revenueCents, escrowCents, depositsCents, walletsCents, externalCents, audit }`.

- [ ] **Step 1: Write the failing tests:**
  - не передал → спор → `REFUND_ALL` → деньги вернулись, даты свободны;
  - `CONFIRM_HANDOVER` → `ACTIVE`, аренда у владельца;
  - повреждение → спор → `DEPOSIT_TO_OWNER` и `REFUND_DEPOSIT`;
  - пользователь → 403 (Review Focus 3);
  - устаревший `version` → 409;
  - сводка сходится: `audit` пустой, сумма 0.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): dispute resolution and admin views of deals and the ledger`.

---

### Task 12: Договор аренды в PDF на трёх языках

**Files:**
- Create: `apps/api/src/contracts/*`, `apps/api/assets/fonts/{LiberationSans-Regular.ttf,LiberationSans-Bold.ttf,OFL.txt}`.
- Modify: `apps/api/package.json` (`files` + `assets`), `Dockerfile` при необходимости.
- Test: `apps/api/src/contracts/contract.pdf.test.ts`, `apps/api/test/contract.e2e.test.ts`.

**Interfaces:**
- **`terms`** замораживаются при `ACCEPT`:
  - стороны (имя, почта), вещь (заголовок, состояние, район, правила), период, часовой пояс;
  - цена, залог, правило залога и сроки из настроек на момент принятия;
  - `termsHash = sha256(canonical JSON)`.
- **`GET /bookings/:id/contract.pdf?lang=en|lv|ru`** (стороны и администратор; без `lang` — язык зрителя):
  - PDF на этом языке;
  - номер договора — id сделки, хэш условий, подписи с временем (или «не подписан»);
  - суммы через `formatMoney`, даты по языку;
  - `Content-Disposition: attachment; filename="yoyo-contract-<id>.pdf"`.
- **Шрифт** Liberation Sans встраивается подмножеством (`subset: true`). Пользовательский текст переносится по ширине, длинные слова режутся.

- [ ] **Step 1: Write the failing tests:**
  - PDF начинается с `%PDF-`, в тексте (`pdf-lib` извлекает) есть «Nomas līgums» и «Договор аренды», латышские буквы и кириллица не теряются;
  - хэш не меняется после правки объявления;
  - третий → 404;
  - до `ACCEPT` → 404.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): rental contract PDF in English, Latvian and Russian`.

---

### Task 13: Письма о событиях сделки

**Files:**
- Create: `apps/api/src/mail/templates/DealEvent.tsx`.
- Modify: `mail.service.ts`, `mail/i18n/{en,lv,ru}.json` (раздел `deal`), `effects.executor.ts`.
- Test: `apps/api/test/deal-mail.e2e.test.ts`, `apps/api/src/mail/deal-texts.test.ts`.

**Interfaces:**
- **`MailService.sendDealEvent(recipient, { template, role: 'renter' | 'owner' | 'admin', title, period, amounts, link, extra? })`** — через общий `deliver` с дневным бюджетом.
- **Тексты** `deal.<TEMPLATE>.<renter|owner|admins>.{subject, preview, heading, body}` на трёх языках для каждой пары, которую может дать таблица ядра:
  - `REQUESTED`→владелец; `ACCEPTED`, `DECLINED`→арендатор; `CANCELLED`→обе; `EXPIRED`→обе;
  - `PAID`→владелец; `HANDED_OVER`→арендатор; `RECEIVED`→обе; `RETURNED`→владелец; `RECEIVED_BACK`→обе; `ALL_FINE`→обе;
  - `DAMAGE_REPORTED`→арендатор; `DAMAGE_ACCEPTED`→владелец; `DISPUTE_OPENED`→все трое; `DISPUTE_RESOLVED`→обе;
  - плюс `OFFER_MADE` и `OFFER_ANSWERED`.
- **Получатели `ADMINS`** — все администраторы, не удалённые, не больше 5 писем на событие.
- Письма уходят после коммита. Удалённым пользователям писем нет.
- Тест сверяет пары: прогон сценариев ядра собирает все `NOTIFY`, и для каждой пары есть текст на трёх языках.

- [ ] **Step 1: Write the failing tests:**
  - полная сделка → нужные письма нужным адресатам на их языке (LV-владелец получает латышское письмо);
  - сумма в письме отформатирована (`45,00 €` в LV);
  - бюджет исчерпан → действие всё равно проходит.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): deal emails in English, Latvian and Russian`.

---

### Task 14: Свойство: деньги сходятся в сохранённом потоке

**Files:**
- Test: `apps/api/test/ledger.property.e2e.test.ts`.

**Interfaces:** fast-check над настоящими сервисами и базой (без HTTP, ради скорости):
- случайно: 1–3 вещи, 2–4 пользователя с пополненными кошельками, 1–4 сделки, 5–30 шагов;
- шаги: запрос, любое действие из `availableActions` стороны (данные — из генераторов), оплата кошельком или картой, перевод часов на 1–72 часа, `runDue()`, пополнение, вывод;
- **после каждого шага** `audit()`:
  - сумма всех проводок 0;
  - кэш совпадает с проводками;
  - каждая операция сбалансирована;
  - нет отрицательных кошельков, escrow и залогов;
- **в конце:**
  - у каждой закрытой сделки escrow и залог пусты;
  - у пересекающихся `reserved` одной вещи нет пар;
  - выручка Yoyo равна сумме сборов оплаченных и не возвращённых сделок;
- `numRuns` 25 (CI); `FC_RUNS` в env поднимает число.

- [ ] **Step 1:** Написать свойство. Оно должно пройти сразу. Проверить, что оно ловит ошибку: временно убрать блокировку счёта или одну проводку и увидеть провал, затем вернуть.
- [ ] **Step 2: Commit.** `test(api): money is conserved across random persisted deals`.

---

### Task 15: Документация, развёртывание, клиент

**Files:**
- Modify:
  - `render.yaml`: `TIMERS_SECRET` (`generateValue: true`), `PAYMENTS=fake`;
  - `apps/api/.env.example`;
  - `README.md` (раздел «Сделки и кошелёк»: статусы, деньги, карта для проверки, таймеры и их секрет, договор);
  - `apps/api/openapi.json`, `packages/api-client/src/schema.d.ts`;
  - `docs/superpowers/plans/2026-11-03-yoyo-roadmap.md` (статус плана 8).
- Test: полный набор.

- [ ] **Step 1:** Перегенерировать OpenAPI и клиент; в CI проверка расхождения зелёная.
- [ ] **Step 2:** `pnpm turbo run lint typecheck test build`, `pnpm --filter @yoyo/web e2e`. API стартует в production без `TIMERS_SECRET` (endpoint 404, при старте таймеры всё равно идут).
- [ ] **Step 3: Commit.** `docs: deals and wallet API, timers and deploy env`.

---

## Действия владельца после слияния

1. Render → yoyo-api → Environment: `TIMERS_SECRET` создаётся сам (`generateValue`). Скопировать его значение.
2. GitHub → Settings → Secrets and variables → Actions:
   - секрет `TIMERS_SECRET` (то же значение);
   - секрет `API_URL` = `https://yoyo-api.onrender.com`.
3. Actions → «Run due timers» → Run workflow: убедиться, что ответ 200.

Запрос каждые 10 минут не даёт бесплатному серверу уснуть. Это расходует часы бесплатного тарифа: 750 в месяц хватает одному сервису на весь месяц.

## Self-Review (выполнено при написании)

- **Покрытие спецификации:**
  - §4.4 шаги 1–7, отмена, «не вернул», занятость: Task 6–11; отзывы — план 10;
  - §4.5: Task 2, 5, 11;
  - §4.6 «предложить цену» (данные и API): Task 6; кнопка в чате — план 9;
  - §4.7 письма: Task 13; уведомления на сайте — план 9;
  - §4.9 PDF на языке зрителя: Task 12;
  - §5 безопасность: доступ (Task 6–11), проверка ввода (zod), лимиты частоты, файлы (Task 9);
  - §6: `Booking`, `BookingEvent`, `Contract`, `BookingPhoto` (= `HandoverPhoto`), `Dispute` (колонки `dispute*` сделки, у сделки один текущий спор), `LedgerAccount` (= `Wallet`), `LedgerEntry`, `Payout`, `Offer`.
- **§4.4 «демо-инструменты» не делаются** — §0 их отменил.
- **Связь с ядром:** `createRequest`, `decide`, `availableActions`, `quote`, `validateOffer`, `applyOperation`, `assertBalanced`, `formatMoney` берутся из `@yoyo/domain`.
- **Согласованность имён:** `PaymentProvider`, `FakeCardProvider`, `LedgerService`, `MoneyOutService`, `TimersService.runDue`, `EffectsExecutor`, `BookingView`, `Idempotent` одинаковы во всех задачах.
