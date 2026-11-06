# Yoyo — План 8b: Сделка и кошелёк, экраны. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Человек на сайте может:
- выбрать даты на вещи и отправить запрос брони, видя цену, скидку, сбор, залог и итог, посчитанные тем же ядром `@yoyo/domain`, что и API;
- подписать договор, скачать его в PDF и оплатить бронь из кошелька или «картой» на экране оплаты, который выглядит и ведёт себя как настоящий, но честно подписан «тестовый режим»;
- видеть на странице сделки весь её путь: запрос, ответ владельца, договор, оплата и замороженный залог, передача, возврат, окно проверки, повреждение и спор, итог; сроки, которые сработают сами, идут обратным отсчётом;
- нажимать только те кнопки, которые ядро разрешает этой стороне сейчас (`actions` из API);
- открыть «Мои сделки» с вкладками «Я арендую» / «Я сдаю», группами «Ждут меня» / «Идут» / «Закрыты» и счётчиками на вкладках;
- открыть кошелёк: доступно, заморожено в залогах, ждёт передачи, заработано; пополнить и вывести через тестовую карту; посмотреть историю проводок с фильтрами и ссылками на сделки;
- найти «Мои сделки» и «Кошелёк» в меню пользователя.

Всё по `DESIGN.md` (стиль Sticker, рабочие экраны спокойнее главной, §7), на EN/LV/RU, в светлой и тёмной теме, на 320 и 390 px, с клавиатуры и читалкой.

**Оплата остаётся имитацией** (решение владельца, 2026-11-06): провайдер `PAYMENTS=fake` за интерфейсом `PaymentProvider` из плана 8. Экран оплаты устроен как у настоящего провайдера (поле номера с маркой и пробелами, срок, CVC, имя, токен вместо номера), поэтому подключение Stripe позже меняет только способ получить токен — `tokenizeCard()` на сайте и класс провайдера в API.

**Architecture:**
- **Только клиент**, как планы 5 и 6b: закрытые экраны под `RequireSession`, данные через TanStack Query и `@yoyo/api-client`. Страница брони вещи (`/items/[id]/book`) открыта всем: условия вещи публичные, отправка запроса просит войти и возвращает обратно (`?next=`).
- **Правила — в ядре.** Сайт не решает, какие кнопки показать: это `booking.actions` из API (`availableActions` ядра). Цену в калькуляторе брони считает `quote()` из `@yoyo/domain` с ценами вещи и `servicePercent` из API; ответ `POST /bookings` — источник правды, и если он разошёлся с показанным, экран показывает итог API.
- **Ключи идемпотентности на каждом действии с деньгами и сделкой.** Хук `useIdempotentMutation` держит один ключ на одно намерение (действие + версия сделки + тело). Повтор после сетевой ошибки или `409 IDEMPOTENCY_IN_PROGRESS` идёт с тем же ключом, поэтому двойной клик или обрыв связи не списывают дважды; после успеха или окончательной ошибки ключ сбрасывается. Ключ — `crypto.randomUUID()` в формате API (`[A-Za-z0-9_-]{8,100}`).
- **Оптимистичный интерфейс — только где безопасно.** Деньги, оплата и шаги сделки ждут ответа API (кнопка в состоянии загрузки, поле не прыгает). Оптимистично меняется только то, что нельзя потерять: фильтр истории, вкладка, выбранный способ оплаты.
- **Устаревшая версия.** `409 INVALID_STATUS` / `DEADLINE_PASSED` / `ACTION_NOT_ALLOWED` перечитывают сделку и показывают, что случилось («Срок вышел, сделка перешла дальше»), а не голую ошибку.
- **Шкала сделки** — чистая функция `dealTimeline(booking, history)` в `lib/deals/timeline.ts`: шаги в порядке таблицы ядра, у каждого состояние `done | current | upcoming | skipped`, время из `history` (журнал `BookingEvent`), текущий срок из `booking.deadline`. Компонент только рисует.
- **Обратный отсчёт** — `useDeadline(dueAt)`: считает от часов, а не от тиков (фоновая вкладка не врёт), тикает раз в секунду в последний час и раз в минуту раньше; когда срок вышел — один раз перечитывает сделку (таймер на сервере мог уже сработать).
- **Движение** — только примитивы `components/motion/`: `TransitionLink` между списком и сделкой, плюс общий элемент (обложка вещи) с `view-transition-name` только на время перехода (`html[data-page-switch]`); `CountUp` для сумм кошелька; `Reveal` для истории. Новые микродвижения (шаг шкалы «щёлкает», печать «Подписано») — CSS в `motion.css`, только `transform`/`opacity`, 150–450 мс, `ease-yoyo`, выключены при `prefers-reduced-motion`. Ширина чисел держится невидимым итогом (без сдвига раскладки).
- **Каталог (план 7) делает другая сессия.** Пока карточки вещи `/items/[id]` в `main` нет, вход в бронь — отдельная страница `/items/[id]/book`, а на карточке «Моих вещей» у опубликованной вещи есть «Ссылка для брони». `BookingPanel` — самостоятельный компонент: карточка вещи плана 7 вставляет его в свою колонку, и страница `/book` остаётся как запасной вход.

**Tech Stack:** уже есть всё (Next.js 16, next-intl 4, Tailwind 4, TanStack Query, `@yoyo/api-client`, `@yoyo/domain`, `@yoyo/shared`, Vitest, Playwright с axe). Новых зависимостей нет: календарь, форма карты и шкала — свои.

**Spec:** [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md):
- §4.4 — шаги сделки, «обе стороны всегда видят, на каком она шаге и что дальше», отмена, споры, статусы на экране;
- §4.5 — кошелёк, история с фильтрами и ссылками на сделки;
- §4.9 — состояния (загрузка, пусто, ошибка, нет доступа), PDF на языке зрителя, суммы и даты по языку;
- §7 — маршруты `/bookings/[id]`, `/wallet`; список сделок — `/bookings` (вкладки «Я арендую» и «Я сдаю» вместо двух адресов `/dashboard/renting|lending`: `/dashboard/lending` уже занят «Моими вещами»);
- §8 — микровзаимодействия.

API — [план 8](./2026-11-05-yoyo-08-deals-api.md) (слит, PR #6), движение — [план «Движение»](./2026-11-05-yoyo-motion.md) (PR #10).

## Global Constraints

**Общие**
- Действуют правила планов 1, 5, 6b и «Движения»: TypeScript strict, три языка с одинаковыми ключами, `DESIGN.md`, политика pnpm, бюджет ноль.
- **Тексты сделок и кошелька — в своих файлах** `messages/deals/{en,lv,ru}.json` (как `messages/site/`), чтобы правки параллельной ветки каталога в `messages/*.json` не конфликтовали. Тест ключей проверяет и их.
- **Деньги** — целые центы; на экране только `formatMoney` из `@yoyo/domain` (en `€1,234.50`, lv/ru `1 234,50 €`). Ввод суммы — `parseEuros` из плана 6b.
- **Даты** — `LocalDate` сделки показываются по языку без сдвига пояса (`Intl.DateTimeFormat` с `timeZone: 'UTC'` для дня); моменты (`dueAt`, `createdAt`) — в поясе сделки (`booking.timeZone`).
- **Статусы** (`DESIGN.md` §4): запрос — Sunburst; принята и оплачена с залогом — Lavender («залог заморожен» с PAID по RETURNED); активная — Electric Blue; спор и повреждение — Ember; завершена — Voltage Violet с белым текстом; отклонена, истекла, отменена — Soft Mist. Всегда иконка и текст.

**Тестовый режим оплаты**
- Над формой карты — заметная плашка «Тестовый режим: деньги не списываются» со списком тестовых номеров и кнопками «подставить». Плашка в DOM, не только цветом.
- Номер карты не хранится в состоянии дольше формы, не пишется в лог и не уходит никуда, кроме `POST /payments/card-tokens`; после токенизации поле очищается. `autocomplete="cc-number"` и т. д. — как у настоящей формы.
- Проверка на клиенте совпадает с провайдером: Лун, марка по номеру (Visa, Mastercard, Amex), срок не в прошлом, CVC 3 цифры (Amex 4), имя 2–100.
- Отказ карты (`402 PAYMENT_DECLINED`) показывает причину по `details.declineCode` (`card_declined`, `insufficient_funds`, `expired_card`, `processing_error`) у формы, сделка остаётся `ACCEPTED`.

**Доступность (WCAG 2.2 AA в обеих темах)**
- Шкала сделки — упорядоченный список, текущий шаг `aria-current="step"`, обратный отсчёт с текстом (не только кольцом), объявления о смене статуса — `role="status"`.
- Вкладки «Я арендую» / «Я сдаю» — `tablist` с переключением стрелками; счётчик в названии вкладки для читалки.
- Диалоги — `Dialog` из плана 1 (фокус внутри, Esc, возврат фокуса). Поля с `<label>`, ошибки через `aria-describedby`.
- Цели нажатия от 40px (основные кнопки на телефоне 44px), видимый фокус.

## Review Focus

1. **Двойное списание.** Двойной клик «Оплатить», «Пополнить», «Вывести» и повтор после обрыва связи уходят с одним `Idempotency-Key`; API получает один запрос с новым ключом только после успеха. Тест в Task 2 (юнит) и Task 9 (e2e считает списания по истории).
2. **Только разрешённые кнопки.** Кнопки шагов строятся из `booking.actions`; нет ни одной кнопки, которой нет в `actions`. Тест в Task 5.
3. **Тестовая карта как настоящая.** Номер не попадает в запросы, кроме токенизации; ошибки отказа понятны; плашка «тестовый режим» видна. Тест в Task 4.
4. **Чужая сделка.** `/bookings/<чужой id>` — «Сделка не найдена» (API 404), запросы действий не уходят. Тест в Task 5.
5. **Без сдвига раскладки и движения при reduced motion.** Счётчики и обратный отсчёт держат ширину; при `prefers-reduced-motion` шкала, суммы и переход неподвижны. Тест в Task 9.
6. **Деньги сходятся в сквозном сценарии.** После «всё в порядке» у арендатора залог вернулся, у владельца аренда в «Заработано», история показывает каждую проводку со ссылкой на сделку. Тест в Task 9.

---

## Структура файлов (итог плана)

```
packages/shared/src/{bookings.ts,wallet.ts}                     BookingTermsSchema, BookingHistorySchema, MyBookingsSummarySchema, group в списке, WalletSummary+
apps/api/src/bookings/{bookings.controller,bookings.service}.ts   terms, history, summary, group
apps/api/src/wallet/wallet.service.ts                            depositsCents, incomingCents, earnedCents
apps/api/test/deals-ui-api.e2e.test.ts
apps/api/openapi.json · packages/api-client/src/schema.d.ts
apps/web/messages/deals/{en,lv,ru}.json                         deal, deals, booking, checkout, wallet, dealStatus, dealTimeline
apps/web/src/lib/deals/{idempotency.ts,queries.ts,status.ts,timeline.ts,deadline.ts,dates.ts,card.ts,actions.ts} (+ tests)
apps/web/src/components/deals/{DealStatusBadge,DealTimeline,Countdown,DealView,DealActions,ActionDialog,DealPhotos,DealSummary,ContractCard,MyDeals,DealCard,BookingPanel,DateRangePicker,PriceSummary,CheckoutDialog,CardForm,TestModeNotice}.tsx (+ tests)
apps/web/src/components/wallet/{WalletView,BalanceTiles,MoneyDialog,LedgerHistory}.tsx (+ tests)
apps/web/src/app/[locale]/{bookings/page.tsx,bookings/[id]/page.tsx,wallet/page.tsx,items/[id]/book/page.tsx}
apps/web/src/components/layout/UserMenu.tsx, components/listings/MyListingCard.tsx (ссылка для брони)
apps/web/src/styles/motion.css                                  шаг шкалы, печать, общий элемент перехода
apps/web/e2e/{deals.spec.ts,deals-dispute.spec.ts,deals-a11y.spec.ts} + support/deals.ts; fit-on-phones.spec.ts
```

---

### Task 1: API для экранов: условия брони, журнал сделки, сводки

Экранам не хватает четырёх вещей, которых нет в API плана 8. Правила не меняются, только чтение.

**Files:**
- Modify: `packages/shared/src/{bookings,wallet}.ts`, `apps/api/src/bookings/{bookings.controller,bookings.service}.ts`, `apps/api/src/wallet/wallet.service.ts`.
- Test: `apps/api/test/deals-ui-api.e2e.test.ts`.

**Interfaces:**
- **`GET /listings/:id/booking-terms`** (публично, как `quote`; `404` для никогда не публиковавшейся, `409 LISTING_UNAVAILABLE` для скрытой) → `{ listing: { id, title, coverUrl, city, district, ownerId, ownerName }, pricing: { dailyCents, weeklyDiscountPercent, depositCents, minDays, maxDays }, servicePercent, maxAdvanceDays, timeZone, today, blocked: Period[] }`. Всё, что нужно `quote()` ядра и календарю. Карточка вещи плана 7 может брать то же.
- **`GET /bookings/:id/history`** (стороны и администратор, иначе 404) → `{ items: { type, actor: 'RENTER'|'OWNER'|'ADMIN'|'SYSTEM', fromStatus, toStatus, at }[] }`, старые первыми. Без `data` (там могут быть заметки и токены).
- **`GET /me/bookings?group=open|closed`** — вместо одного `status`: открытые (не финальные) или закрытые (`COMPLETED`, `DECLINED`, `EXPIRED`, `CANCELLED`).
- **`GET /me/bookings/summary`** → `{ renter: { open, needsAction }, owner: { open, needsAction } }`; `needsAction` — открытые сделки, где у зрителя есть `actions`. Для счётчиков вкладок и меню.
- **`GET /wallet`** дополняется: `depositsCents` (залоги открытых сделок арендатора любым способом оплаты), `incomingCents` (аренда в escrow по сделкам, где пользователь владелец), `earnedCents` (сумма `RENT_RELEASE` и `DEPOSIT_TO_OWNER` в кошелёк). `heldCents` остаётся.

- [ ] **Step 1: Write the failing tests:** условия опубликованной вещи совпадают с `quote` API; скрытая → 409; черновик → 404; журнал после ACCEPT и PAY — три записи по порядку, третий → 404; `group=open|closed` делит сделки; `summary` считает запрос у владельца как `needsAction`; после полной сделки у владельца `earnedCents` = аренда, у арендатора `depositsCents` = 0, а во время сделки = залог.
- [ ] **Step 2–4:** RED → реализация → GREEN; перегенерировать OpenAPI и клиент.
- [ ] **Step 5: Commit.** `feat(api): booking terms, deal history, deal and wallet summaries for the deal screens`.

---

### Task 2: Основа сайта: ключи идемпотентности, данные, статусы, шкала, сроки

**Files:**
- Create: `apps/web/src/lib/deals/{idempotency.ts,queries.ts,status.ts,timeline.ts,deadline.ts,dates.ts}`, `components/deals/{DealStatusBadge,Countdown}.tsx`, `messages/deals/*.json`.
- Modify: `i18n/request.ts`, `test/render.tsx`, `i18n/messages.test.ts`, `components/layout/UserMenu.tsx`.
- Test: рядом с модулями.

**Interfaces:**
- `useIdempotentMutation({ intent(vars): string, mutate(vars, key): Promise<T> })` — ключ на намерение; тот же ключ при сетевой ошибке и `IDEMPOTENCY_IN_PROGRESS`; новый после успеха и окончательной ошибки. `newIdempotencyKey()`.
- `queries.ts`: `dealKeys`, `useDeal(id)`, `useDealHistory(id)`, `useMyDeals(role, group, page)`, `useDealsSummary()`, `useBookingTerms(listingId)`, `useWallet()`, `useWalletHistory(kind, page)`, `useDealAction(booking)` (POST events с ключом; ответ кладётся в кэш, история и сводки перечитываются).
- `status.ts`: `toneOf(status)`, `isClosed(status)`, `DEAL_GROUPS`.
- `timeline.ts`: `dealTimeline(booking, history): TimelineStep[]`.
- `deadline.ts`: `remaining(dueAt, now)` → `{ days, hours, minutes, seconds, overdue }`, `useDeadline(dueAt, onExpire)`.
- `dates.ts`: `formatDay(localDate, locale)`, `formatPeriod`, `formatMoment(iso, locale, timeZone)`.
- Меню пользователя: «Мои сделки» (`/bookings`) со счётчиком `needsAction`, «Кошелёк» (`/wallet`).

- [ ] **Step 1: Write the failing tests:** ключ не меняется при повторе после сети, меняется после успеха (Review Focus 1); шкала для каждого статуса (запрос, принята, оплачена, передана, активна, возвращена, повреждение, спор, завершена, отклонена, истекла, отменена до и после оплаты); `remaining` на границах; бейдж — цвет, иконка и текст; меню показывает новые пункты и счётчик.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): deal data hooks, idempotency keys, statuses, timeline model and countdowns`.

---

### Task 3: Запрос брони: даты и сводка цены

**Files:**
- Create: `components/deals/{BookingPanel,DateRangePicker,PriceSummary}.tsx`, `app/[locale]/items/[id]/book/page.tsx`.
- Modify: `components/listings/MyListingCard.tsx` (ссылка для брони у опубликованной вещи).

**Interfaces:**
- `DateRangePicker` — сетка месяца с навигацией стрелками (как календарь 6b), занятые дни зачёркнуты и `aria-disabled`, диапазон не может перескочить занятый день, `minDays`/`maxDays`/`maxAdvanceDays` подсвечиваются текстом.
- `PriceSummary` — `quote()` ядра: дни × цена, недельная скидка, сбор, залог (с пометкой «вернётся»), итог; суммы с `CountUp`-шириной (без прыжков).
- `BookingPanel` — даты, сообщение владельцу (до 1000), «Отправить запрос» → `POST /bookings` с ключом → переход на `/bookings/:id`. Своя вещь — объяснение вместо кнопки; гость — «Войти, чтобы забронировать» с `?next=`.

- [ ] **Step 1: Write the failing tests:** 8 дней по 15 € со скидкой 10 % → аренда 108,00 €, сбор 10,80 € (как в API); выбор через занятый день невозможен; отправка уходит с `Idempotency-Key` и ведёт на сделку; `DATES_UNAVAILABLE` показывает текст и снимает выбор.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): booking request with a date range picker and the domain's price summary`.

---

### Task 4: Оплата: тестовая карта как настоящая

**Files:**
- Create: `lib/deals/card.ts`, `components/deals/{CheckoutDialog,CardForm,TestModeNotice}.tsx`.

**Interfaces:**
- `card.ts`: `luhn`, `brandOf`, `formatCardNumber` (4-4-4-4, Amex 4-6-5), `parseExpiry('12/34')`, `checkCard(input, now)`, `TEST_CARDS`; `tokenizeCard(client, input)` — единственное место, где номер уходит из браузера (у Stripe здесь будет Stripe.js).
- `CardForm` — номер с маркой, срок `MM / YY`, CVC, имя; `inputMode="numeric"`, `autocomplete="cc-*"`; ошибки у полей.
- `CheckoutDialog` — способ: кошелёк (с балансом, «не хватает N» и ссылкой пополнить) или карта; итог; «Оплатить N» → токен → `PAY` с ключом. Отказ — причина у формы, ключ сбрасывается (новая попытка — новое намерение).

- [ ] **Step 1: Write the failing tests:** Лун и марки; срок в прошлом; CVC Amex; номер не уходит в `POST /bookings/:id/events`; двойной клик — один запрос; `402 card_declined` — текст и сделка не меняется (Review Focus 3).
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): checkout with a clearly labelled test card that behaves like a real one`.

---

### Task 5: Страница сделки

**Files:**
- Create: `components/deals/{DealView,DealTimeline,DealActions,ActionDialog,DealPhotos,DealSummary,ContractCard}.tsx`, `app/[locale]/bookings/[id]/page.tsx`.

**Interfaces:**
- Шапка: обложка (общий элемент перехода), название, стороны, период, бейдж статуса.
- `DealTimeline` — шаги из `dealTimeline`, текущий с обратным отсчётом («Запрос истечёт через 23 ч 59 мин»), выполненные с временем, пропущенные приглушены.
- `DealActions` — по кнопке на каждое `actions`; главная (`PAY`, `ACCEPT`, `CONFIRM_RECEIVED`, …) залита, остальные контурные; `DECLINE`, `CANCEL`, `REPORT_*`, `REJECT_DAMAGE` открывают `ActionDialog` с причиной; `REPORT_DAMAGE` — описание и фото повреждения (загрузка `DAMAGE`); `PAY` — `CheckoutDialog`.
- `ContractCard` — подписи сторон с временем, «Подписать», «Скачать PDF» (EN/LV/RU, по умолчанию язык страницы).
- `DealSummary` — деньги сделки: аренда, сбор, залог и где он сейчас (заморожен, вернулся, у владельца), итог.
- `DealPhotos` — фото передачи, возврата и повреждения; загрузка тем, кому API разрешает.
- Ошибки: 404 → «Сделка не найдена»; `DEADLINE_PASSED`, `ACTION_NOT_ALLOWED`, `INVALID_STATUS` → перечитать и объяснить.

- [ ] **Step 1: Write the failing tests:** кнопок ровно столько, сколько `actions` (Review Focus 2); отказ с причиной; подпись; PDF-ссылка на языке страницы; 404 (Review Focus 4); `DEADLINE_PASSED` перечитывает сделку.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): deal page with the full timeline, countdowns, contract and the actions the core allows`.

---

### Task 6: «Мои сделки»

**Files:**
- Create: `components/deals/{MyDeals,DealCard}.tsx`, `app/[locale]/bookings/page.tsx`.

**Interfaces:** вкладки ролей (`tablist`, счётчики из `summary`), группы «Ждут меня» / «Идут» / «Закрыты» (в адресе `?role=&group=`), карточки сделок с обложкой, бейджем, периодом, итогом, ближайшим сроком и «ваш ход», переход на сделку через `TransitionLink` с общей обложкой; пустые состояния с наклейкой; скелетоны без сдвига; «Показать ещё».

- [ ] **Step 1: Write the failing tests:** вкладки и стрелки; группа «Ждут меня» показывает только сделки с `actions`; пусто; ошибка и «Попробовать снова».
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): my deals for renters and owners with tabs, groups and badges`.

---

### Task 7: Кошелёк

**Files:**
- Create: `components/wallet/{WalletView,BalanceTiles,MoneyDialog,LedgerHistory}.tsx`, `app/[locale]/wallet/page.tsx`.

**Interfaces:** плитки «Доступно», «В залогах», «Ждёт передачи», «Заработано» (`CountUp`); «Пополнить» и «Вывести» — `MoneyDialog` с суммой (`parseEuros`, лимиты `WALLET_LIMITS`), картой (`CardForm`) и ключом; история — фильтр-пилюли по видам (`kind` в адресе), строки со знаком и суммой, ссылка на сделку, страницы.

- [ ] **Step 1: Write the failing tests:** пополнение — запрос с ключом и токеном, баланс обновлён; вывод больше доступного блокируется до запроса; `WALLET_LIMIT`; фильтр уходит в запрос; ссылка на сделку.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): wallet with balances, test-card top-ups and payouts, and the ledger history`.

---

### Task 8: Движение и полировка

**Files:** `styles/motion.css`, компоненты Task 3–7.

- Общий элемент перехода «список → сделка» (обложка) только под `html[data-page-switch]`; шаг шкалы «щёлкает» при смене статуса; печать «Подписано»; кнопки и пилюли — общий подъём и `scale(.96)`. Всё выключено при `prefers-reduced-motion`.
- Проверить 320/390 px, обе темы, EN/LV/RU: длинные слова LV и RU (`Nodošanas apstiprinājums`, `Подтверждение возврата`) переносятся.

- [ ] **Commit.** `feat(web): deal and wallet motion: shared cover between list and deal, timeline tick, signed stamp`.

---

### Task 9: Сквозные проверки

**Files:** `apps/web/e2e/{deals.spec.ts,deals-dispute.spec.ts,deals-a11y.spec.ts}`, `e2e/support/deals.ts`, `fit-on-phones.spec.ts`.

- **Полный путь, два пользователя в двух контекстах браузера:** владелец сдаёт вещь (API), администратор одобряет; арендатор пополняет кошелёк тестовой картой, бронирует через `/items/:id/book`; владелец принимает; обе стороны подписывают; арендатор платит картой (сначала 0002 → отказ, затем 4242); владелец «Передал», арендатор «Получил»; арендатор «Вернул», владелец «Получил обратно», «Всё в порядке»; у арендатора залог вернулся, у владельца в кошельке аренда, история со ссылками на сделку (Review Focus 6). PDF договора скачивается.
- **Спор:** после возврата владелец заявляет повреждение с фото, арендатор не согласен → «Спор», администратор решает через API → обе стороны видят решение.
- **Доступность и телефон:** axe без serious/critical на сделке, списке, кошельке, брони, оплате в обеих темах; новые экраны в `fit-on-phones`; reduced motion — без анимаций.

- [ ] **Commit.** `test(web): full deal flow for two users, the dispute path, accessibility and phones`.

---

### Task 10: Документация

- `README.md` (раздел про экраны сделки и тестовые карты), дорожная карта (строка 8b), OpenAPI и клиент.
- `pnpm turbo run lint typecheck test build`, `pnpm --filter @yoyo/web e2e`.
- [ ] **Commit.** `docs: deal and wallet screens`.

## Связь с каталогом (план 7)

Ветка каталога делается параллельно. Пока карточки вещи нет в `main`:
- `BookingPanel` (`components/deals/BookingPanel.tsx`) принимает `listingId` и сам грузит `GET /listings/:id/booking-terms`; карточка вещи плана 7 вставляет его в свою колонку и ссылку «Забронировать» ведёт на него;
- `/items/[id]/book` — запасной вход, который остаётся и после каталога (прямая ссылка на бронь);
- «Ссылка для брони» на карточке «Моих вещей» — до появления каталога единственный способ поделиться вещью.

Если каталог сольют раньше этого PR — вставить `BookingPanel` в его карточку вещи в этой же ветке.

## Self-Review (выполнено при написании)

- **Покрытие:** §4.4 шаги 1–7 (запрос, подтверждение, договор и подписи, оплата и залог, передача, возврат, проверка, повреждение, спор, отмена, тайм-ауты) — Task 3–5; §4.5 — Task 7; §4.9 — все состояния у каждого экрана; отзывы (шаг 8) — план 10; чат и «предложить цену» в чате — план 9.
- **Правила только в ядре:** кнопки — `actions`, цена — `quote()`, переходы и деньги — API.
- **Имена:** `useIdempotentMutation`, `dealTimeline`, `useDeadline`, `BookingPanel`, `CheckoutDialog`, `CardForm`, `tokenizeCard` одинаковы во всех задачах.
