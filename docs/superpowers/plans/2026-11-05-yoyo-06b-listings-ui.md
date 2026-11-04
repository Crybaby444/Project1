# Yoyo — План 6b: Объявления, экраны. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Человек на сайте может:
- сдать вещь через пошаговый конструктор с автосохранением черновика и живым превью будущей карточки;
- загрузить до 8 фото, обрезать и повернуть их, расставить по порядку мышью или клавиатурой (первое — обложка);
- выбрать категорию и заполнить её характеристики;
- указать цену, скидку, залог и сроки; отметить точку на карте и дни, когда вещь недоступна; задать правила;
- отправить объявление на модерацию и видеть его состояние (черновик, на модерации, отклонено с причиной и ссылкой на правку, опубликовано, скрыто, удалено);
- управлять своими вещами на странице «Мои вещи».

Администратор видит очередь модерации, одобряет или отклоняет объявление с причиной; решение относится к той версии, которую он просмотрел.

Всё по `DESIGN.md`, на EN/LV/RU, в светлой и тёмной теме, на телефоне и компьютере.

**Architecture:**
- **Только клиент.** Все экраны плана закрытые: сессию проверяет `RequireSession` в браузере (план 5), данные идут через TanStack Query и типизированный клиент `@yoyo/api-client` по своему домену (`/api/v1/...`).
- **Черновик с автосохранением.** Хук `useListingDraft` держит локальные значения конструктора и отправляет `PATCH /listings/:id` с `version` через 700 мс после последней правки, по одному запросу за раз. Ответ даёт новую `version`. Устаревшая `version` (`409 INVALID_STATUS` с `details.currentVersion`) останавливает автосохранение и показывает «Объявление изменили в другой вкладке» с кнопкой «Загрузить свежую версию»: чужие правки молча не затираются.
- **Первое изменение создаёт черновик.** `/listings/new` ничего не создаёт при открытии (иначе каждый заход плодит пустые черновики). Первая правка или первое фото делает `POST /listings`, затем адрес заменяется на `/listings/:id/edit`.
- **Фото.** Обрезка и поворот — на клиенте, на `<canvas>`, без библиотек: результат кодируется в JPEG (длинная сторона до 2048 px, качество 0.9), поэтому файл всегда меньше лимита прокси. Загрузка — `XMLHttpRequest` ради прогресса; на `401` он один раз ждёт общий `refreshOnce()` из плана 5 и повторяет запрос.
- **Карта.** Leaflet 1.9 с бесплатными растровыми плитками OpenStreetMap (без ключа), адрес плиток в `NEXT_PUBLIC_MAP_TILES_URL`, по умолчанию `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Leaflet грузится динамически только на шаге «Где и когда». Поиск адреса и район точки — только через API (`/geo/search`, `/geo/reverse`), сайт к Nominatim не ходит.
- **Правила цены — из ядра.** Сайт подключает `@yoyo/domain` и проверяет цену тем же `validatePricing` и границами `PRICING_LIMITS`, что и API; пример расчёта — через `quote`.
- **Админ.** `RequireRole('ADMIN')` поверх `RequireSession` скрывает экран модерации от остальных («Нет доступа»). Настоящую защиту даёт API (`403`), экран лишь не показывает недоступное.

**Tech Stack:**
- уже есть: Next.js 16, next-intl 4, Tailwind 4, TanStack Query, react-hook-form, `@yoyo/api-client`, `@yoyo/shared`, Vitest и Testing Library, Playwright с axe;
- новое: `leaflet` 1.9.4 и `@types/leaflet`, `@yoyo/domain` (рабочий пакет) в зависимостях сайта;
- обрезка фото, перетаскивание и календарь — свои, без библиотек.

Версии берутся последние стабильные, проходящие политику pnpm о возрасте релиза.

**Spec:** [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md):
- §0 (приоритет: настоящий сервис, без демо-подпорок — автоматической модерации для демо-пользователей нет);
- §4.3 (конструктор, шаги 1–6, живое превью);
- §4.8 (очередь модерации, причина видна владельцу);
- §4.2 «Личный кабинет»: мои вещи и их статусы;
- §4.9 (состояния, темы, доступность, телефон);
- §7 (маршруты `/listings/new`, `/listings/[id]/edit`, `/dashboard/lending`, `/admin/listings`);
- §8 (микровзаимодействия: переходы шагов конструктора, индикатор загрузки фото, тосты).

API — [план 6](./2026-11-04-yoyo-06-listings-api.md) (PR #3), экраны аккаунта — [план 5](./2026-11-04-yoyo-05-accounts-ui.md) (PR #4). Код сделок (план 8) не трогается.

## Global Constraints

**Общие**
- Действуют правила планов 1, 5 и 6: TypeScript strict, три языка с одинаковым набором ключей, `DESIGN.md`, политика pnpm, бюджет ноль.
- **Рабочие экраны спокойнее главной** (`DESIGN.md` §7): холст `canvas`, карточки `surface` с контуром 1px, кнопки-пилюли, дисплейный шрифт только в заголовке экрана. Наклейка допускается в пустых состояниях («Пока ни одной вещи»).
- **Микровзаимодействия** (`DESIGN.md` §1): каждый интерактивный элемент реагирует на наведение, фокус и нажатие (подъём кнопок, наклон карточек, покачивание наклейки), переход шагов — сдвиг 250 мс, фото при перетаскивании приподнимается. Длительности 150–450 мс, кривая `ease-yoyo`, всё выключается при `prefers-reduced-motion`.
- **Фото** только внутри рамки 1px с радиусом не меньше 14px (`DESIGN.md` §3).
- **Статусы объявления** — пилюли с иконкой и текстом (цвет не единственный признак), из палитры наклеек: черновик — бумага с контуром, на модерации — Sunburst, опубликовано — Electric Blue, отклонено — Ember, скрыто — Lavender, удалено — Soft Mist. Mint не используется как «успех».
- **Тексты.** Никакой рыбы и мёртвых ссылок, все строки в `messages/{en,lv,ru}.json`. Имена категорий, характеристик и вариантов берутся из `names`/`labels` API на языке страницы.

**Точная точка**
- Точку (`lat`, `lng`) видит только владелец в конструкторе. Превью карточки и «Мои вещи» показывают только город и район, как будет в каталоге (план 7). В очереди модерации администратор видит город и район; точка ему не нужна для решения и тоже не выводится.
- Подпись «© OpenStreetMap contributors» (из ответа API) видна рядом с картой и результатами поиска.

**Доступность (WCAG 2.2 AA в обеих темах)**
- Каждое поле с `<label>`, ошибки связаны через `aria-describedby` и `aria-invalid`; после неудачной отправки фокус на первом поле с ошибкой.
- Шаги конструктора — список ссылок с `aria-current="step"`; при смене шага фокус переходит на заголовок шага.
- **У любого перетаскивания есть замена без него** (WCAG 2.5.7): порядок фото — кнопки «раньше / позже / сделать обложкой» и клавиши (пробел берёт фото, стрелки двигают, пробел ставит, Esc отменяет) с объявлением в `aria-live`; обрезка — кнопки и стрелки для сдвига и масштаба; точка на карте — поиск адреса и кнопка «Поставить точку в центр карты».
- Календарь — таблица-сетка с перемещением стрелками, Home/End, PageUp/PageDown; выбранные дни помечены не только цветом (зачёркивание и `aria-pressed`).
- Видимый фокус, цели нажатия не меньше 40px (на телефоне 44px у основных), контраст текста AA.

**Ошибки API**
- `ApiError` плана 5 получает `details`. Текст для человека — из `errors.<CODE>`.
- `503 STORAGE_DISABLED` при загрузке фото показывает понятный текст «Фото сейчас нельзя загрузить: хранилище не подключено. Остальное можно заполнить, черновик сохранится», и зона загрузки выключается до перезагрузки страницы.
- `400 LISTING_INCOMPLETE` раскрывается в список «Что осталось» по шагам (`details.steps`) со ссылками на нужный шаг и подсветкой полей.
- `409 INVALID_STATUS` при автосохранении — сообщение о конфликте (см. Architecture); при модерации — «Владелец изменил объявление, пока вы его смотрели» и перезагрузка карточки.

**Проверка на клиенте совпадает с API**
- Тексты: `LISTING_LIMITS` из `@yoyo/shared` (название 5–80, описание 30–3000, свои правила до 5 по 3–120).
- Цена: `PRICING_LIMITS` и `validatePricing` из `@yoyo/domain` (1–10 000 € в день, скидка 0–90 %, залог 0–50 000 €, сроки 1–365 дней, максимум не меньше минимума).
- Характеристики: `validateAttributes` из `@yoyo/shared`.
- Суммы вводятся в евро с запятой или точкой («12,50»), хранятся в центах.

## Review Focus

1. **Чужое и недоступное.** Чужое объявление в `/listings/:id/edit` (API отвечает 404) показывает «Объявление не найдено», а не пустой конструктор. Обычный пользователь на `/admin/listings` видит «Нет доступа», запрос к очереди не уходит. Пункт «Модерация» в меню есть только у администратора. Тест в Task 1 и Task 8.
2. **Две вкладки.** Правка в одной вкладке, затем в другой. Ожидание: вторая не затирает первую, показывает конфликт и предлагает загрузить свежую версию. Решение администратора уходит с версией, которую он видел. Тест в Task 2 и Task 8.
3. **Точка не утекает.** В превью, «Моих вещах» и очереди модерации нет координат, ни в тексте, ни в атрибутах разметки. Тест в Task 5 и Task 7.
4. **Плохой файл и выключенное хранилище.** SVG, HTML под видом JPEG, файл больше 10 МБ, девятое фото, `503 STORAGE_DISABLED`. Ожидание: понятный текст у фото, остальной конструктор работает. Тест в Task 3.
5. **Клавиатура и телефон.** Весь сценарий «создать и отправить» проходится без мыши; на 390px ничего не обрезано и нет горизонтальной прокрутки; axe без serious и critical в обеих темах. Тест в Task 9.

---

## Структура файлов (итог плана)

```
apps/web/src/lib/listings/{money.ts,listing-checks.ts,categories.ts,calendar.ts,image-edit.ts,upload-photo.ts,use-listing-draft.ts,queries.ts,reorder.ts} (+ tests)
apps/web/src/lib/session/{api-error.ts,RequireRole.tsx}                      (+ tests)
apps/web/src/components/listings/{ListingBuilder,StepNav,ListingPreview,ListingStatusBadge,SaveIndicator,ConflictNotice}.tsx
apps/web/src/components/listings/steps/{PhotosStep,PhotoGrid,CropDialog,BasicsStep,CategoryPicker,AttributesStep,AttributeField,PriceStep,PlaceStep,LocationMap,AddressSearch,UnavailabilityCalendar,RulesStep,SubmitPanel}.tsx
apps/web/src/components/listings/{MyListings,MyListingCard,ListingActions}.tsx
apps/web/src/components/admin/{ModerationQueue,ModerationCard,RejectDialog}.tsx
apps/web/src/app/[locale]/listings/{new/page.tsx,[id]/edit/page.tsx,layout.tsx}
apps/web/src/app/[locale]/dashboard/lending/page.tsx
apps/web/src/app/[locale]/admin/{layout.tsx,listings/page.tsx}
apps/web/messages/{en,lv,ru}.json          (новые разделы: builder, myListings, moderation, listingStatus, calendar, map)
apps/web/e2e/{listing-builder.spec.ts,my-listings.spec.ts,moderation.spec.ts,listings-a11y.spec.ts}
apps/web/e2e/support/{listings.ts,fake-nominatim.mjs} · apps/web/e2e/fixtures/{item.jpg,item-2.jpg,not-a-photo.jpg}
apps/web/playwright.config.ts              (фейковый Nominatim, администратор для e2e, STORAGE=local)
```

---

### Task 1: Основа: ошибки, данные, деньги, роли, навигация

**Files:**
- Create: `apps/web/src/lib/listings/{money.ts,listing-checks.ts,categories.ts,queries.ts}`, `apps/web/src/lib/session/RequireRole.tsx`, `apps/web/src/components/listings/ListingStatusBadge.tsx`.
- Modify: `apps/web/src/lib/session/api-error.ts` (`details`), `apps/web/src/components/layout/{SiteHeader,UserMenu}.tsx`, `apps/web/package.json` (`@yoyo/domain`), `apps/web/playwright.config.ts`, `apps/web/messages/*.json`.
- Create (e2e): `apps/web/e2e/support/{listings.ts,fake-nominatim.mjs}`, `apps/web/e2e/fixtures/*`.
- Test: рядом с модулями.

**Interfaces:**
- `ApiError.details?: Record<string, unknown>`.
- **`money.ts`:** `parseEuros(text: string): number | null` → центы (`"12,5"` → 1250, `"12.50"` → 1250, `""` → null, `"1,234"` и `"abc"` → NaN-ошибка как `null` с флагом), `formatEuros(cents, locale)` через `Intl.NumberFormat` (EUR).
- **`listing-checks.ts`:** `checkListing(values, mode: 'draft' | 'submit', category?: CategoryNode): Record<string, CheckKey>` — ключи ошибок для полей (`required`, `tooShort`, `tooLong`, `priceRange`, `discountRange`, `depositRange`, `daysRange`, `maxBelowMin`, `chooseSubcategory`, `attribute`), по правилам API (Global Constraints). `stepOf(field)` — из `stepOfField` shared плюс шаг `rules`.
- **`categories.ts`:** `findPath(tree, id): CategoryNode[]`, `isLeaf`, `categoryName(node, locale)`, `attributeLabel`, `optionLabel`.
- **`queries.ts`** (TanStack Query): `useCategories()` (`staleTime` 5 мин), `useListing(id)`, `useMyListings(status?)`, `useModerationQueue(page)`, ключи `['listings', …]` очищаются при выходе (план 5 уже удаляет все ключи, кроме сессии).
- **`RequireRole({ role: 'ADMIN', children })`** внутри `RequireSession`: при другой роли — экран «Нет доступа» (`ErrorView` в стиле Yoyo), дети не монтируются (их запросы не уходят).
- **Шапка:** у вошедшего — кнопка «Сдать вещь» (`/listings/new`, на телефоне иконка «+» с подписью для читалок). Меню пользователя: «Мои вещи» (`/dashboard/lending`), «Модерация» (`/admin/listings`) только для `role === 'ADMIN'`.
- **`ListingStatusBadge({ status })`** — цвета из Global Constraints, иконка и текст `listingStatus.<STATUS>`.
- **e2e-основа:**
  - API в Playwright стартует с `STORAGE=local`, `UPLOADS_DIR` во временной папке, `ADMIN_EMAIL`/`ADMIN_PASSWORD` (только для e2e) и `NOMINATIM_URL` на фейковый Nominatim — третий `webServer` (`e2e/support/fake-nominatim.mjs`, Рига и Юрмала, как в тестах API);
  - `e2e/support/listings.ts`: `createListingByApi(request, fields)`, `uploadPhotoByApi`, `signInAsAdmin(page)`, `fillReadyListing(request)` — готовое к отправке объявление через API;
  - `e2e/fixtures`: два небольших JPEG и HTML-файл с расширением `.jpg`.
- Next: `experimental.proxyClientMaxBodySize = '11mb'`, чтобы прокси не обрезал фото до 10 МБ (лимит проверяет API).

- [ ] **Step 1: Write the failing tests**

```ts
// money.test.ts
expect(parseEuros('12,5')).toBe(1250); expect(parseEuros('12.50')).toBe(1250); expect(parseEuros(' 7 ')).toBe(700);
expect(parseEuros('')).toBeNull(); expect(parseEuros('abc')).toBeNaN(); expect(parseEuros('1.234')).toBeNaN(); // не больше двух знаков
// listing-checks.test.ts: submit без названия → title: 'required'; 'Bike' → tooShort; dailyCents 50 → priceRange (как PRICING_LIMITS);
//   maxDays < minDays → maxBelowMin; категория верхнего уровня → chooseSubcategory; draft пропускает пустые поля
// api-error.test.ts: details из тела попадают в ApiError
// RequireRole.test.tsx: USER видит «Нет доступа», дети не смонтированы; ADMIN видит детей (Review Focus 1)
// UserMenu.test.tsx: пункт «Модерация» только у администратора; «Мои вещи» у всех
```

- [ ] **Step 2: Run, verify FAIL.** `pnpm --filter @yoyo/web test`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `feat(web): listing data hooks, money and price checks, admin-only gate and header links`.

---

### Task 2: Конструктор: каркас, шаги, автосохранение, живое превью, «Основное» и «Характеристики»

**Files:**
- Create: `apps/web/src/lib/listings/use-listing-draft.ts`, `apps/web/src/components/listings/{ListingBuilder,StepNav,ListingPreview,SaveIndicator,ConflictNotice}.tsx`, `steps/{BasicsStep,CategoryPicker,AttributesStep,AttributeField}.tsx`, `apps/web/src/app/[locale]/listings/{layout.tsx,new/page.tsx,[id]/edit/page.tsx}`.
- Test: рядом с компонентами.

**Interfaces:**
- **Маршруты:** `/listings/new` и `/listings/[id]/edit?step=photos|basics|attributes|price|place|rules`. Неизвестный шаг → `photos`. 404 от API → «Объявление не найдено» со ссылкой на «Мои вещи».
- **`useListingDraft({ listing | null, create })`:**
  - `values` (локальная копия полей), `change(patch)`, `flush(): Promise<void>`, `state: 'idle' | 'saving' | 'saved' | 'error' | 'conflict'`, `version`, `listing` (последний ответ API), `applyServer(listing)` для ответов фото и календаря;
  - правки копятся, отправляются через 700 мс одним `PATCH` с изменёнными полями и `version`; в полёте не больше одного запроса; `flush` перед сменой шага и при `visibilitychange: hidden`; `beforeunload` предупреждает, только если есть неотправленное;
  - поле, не прошедшее `checkListing(…, 'draft')`, не отправляется, пока его не исправят;
  - без `listing` первая правка делает `POST /listings` и вызывает `onCreated(id)` (страница делает `router.replace`);
  - `409` → `conflict` (автосохранение стоп); сетевые ошибки → `error` с повтором через 3, 6, 12 с.
- **`SaveIndicator`** (`aria-live="polite"`): «Сохраняем…», «Сохранено», «Не сохранилось — повторим», «Конфликт».
- **`ConflictNotice`:** текст и кнопка «Загрузить свежую версию» (`GET /listings/:id`, локальные правки сбрасываются, с предупреждением).
- **`ListingBuilder`:** слева `StepNav` (на телефоне горизонтальная прокрутка пилюль), в центре шаг, справа `ListingPreview` (на `lg` и шире). На телефоне — кнопка «Превью» открывает `Dialog` с превью. Кнопки «Назад» / «Далее» внизу шага. Смена шага — сдвиг с фокусом на `h2` шага.
- **`ListingPreview`:** карточка, как её увидят в каталоге: обложка (`card`), название, категория, состояние, цена в день, скидка от 7 дней, залог, «Город, район» — без точки; пустые поля — аккуратные заглушки («Название появится здесь»). Карточка наклоняется под курсором (`Card interactive`).
- **«Основное»:** название (счётчик 80), состояние (радиогруппа-пилюли), описание (счётчик 3000), категория.
- **`CategoryPicker`:** верхние категории — пилюли-наклейки своего цвета (`Chip`), затем подкатегории; выбор листа. Смена категории сбрасывает характеристики (`attributes: {}` в том же `PATCH`) с тостом «Характеристики сброшены».
- **«Характеристики»:** поля по `AttributeDef`: TEXT — input (200), NUMBER — `inputmode="decimal"` с единицей, BOOLEAN — переключатель-флажок, SELECT — `<select>` с вариантами на языке страницы. Обязательные помечены. Без выбранной подкатегории — подсказка со ссылкой на «Основное».

- [ ] **Step 1: Write the failing tests**

```ts
// use-listing-draft.test.tsx (фальшивые таймеры, fakeApi):
//  три правки за 500 мс → один PATCH с последними значениями и version; ответ → новая version
//  первая правка без объявления → POST /listings, onCreated(id)
//  PATCH отвечает 409 INVALID_STATUS { currentVersion } → state 'conflict', новых PATCH нет (Review Focus 2)
//  название из 81 символа не уходит
// ListingBuilder.test.tsx: шаги — ссылки с aria-current="step"; «Далее» ведёт на следующий и фокусирует заголовок
// CategoryPicker.test.tsx: выбор Electronics → видны подкатегории; смена категории шлёт attributes: {}
// AttributesStep.test.tsx: SELECT на латышском показывает labels.lv; NUMBER «12,5» уходит числом 12.5
// ListingPreview.test.tsx: показывает «Rīga, Centrs» и не содержит lat/lng ни в тексте, ни в разметке (Review Focus 3)
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): listing builder with autosaved drafts, live preview, category and attribute steps`.

---

### Task 3: Фото: загрузка, обрезка и поворот, порядок, обложка

**Files:**
- Create: `apps/web/src/lib/listings/{image-edit.ts,upload-photo.ts,reorder.ts}`, `steps/{PhotosStep,PhotoGrid,CropDialog}.tsx`.
- Test: рядом; `apps/web/e2e/listing-builder.spec.ts` (часть «фото»).

**Interfaces:**
- **`image-edit.ts`** (чистая геометрия + canvas):
  - `fitCrop(image: {w,h}, rotation: 0|90|180|270, aspect = 4/3)` — начальная рамка по центру;
  - `clampCrop(crop, image, rotation)`, `zoomCrop(crop, factor)`, `moveCrop(crop, dx, dy)`;
  - `renderCrop(source: ImageBitmap, crop, rotation, maxSide = 2048): Promise<Blob>` (JPEG 0.9). Метаданные исходного файла при перекодировании пропадают (сервер всё равно их удаляет).
- **`upload-photo.ts`:** `uploadPhoto(listingId, blob, { onProgress, signal }): Promise<PhotoUploadResponse>` — `XMLHttpRequest` `multipart/form-data` поле `file`; `401` → `refreshOnce()` и один повтор; ответ ошибки → `ApiError` (`toApiError`).
- **Проверка до отправки:** тип по `File.type` и первым байтам (JPEG/PNG/WebP), размер ≤ 10 МБ, не больше 8 — иначе текст у файла без запроса. Окончательно решает API.
- **`PhotosStep`:**
  - зона: перетаскивание файлов, вставка из буфера, кнопка «Выбрать фото» (`<input type="file" accept="image/jpeg,image/png,image/webp" multiple>`);
  - каждый файл сначала открывается в `CropDialog` (можно «Загрузить без обрезки»), затем загружается с полосой прогресса (`role="progressbar"`, проценты);
  - ошибка у конкретного фото с кнопками «Повторить» и «Убрать»; `STORAGE_DISABLED` — общий баннер и выключенная зона (Review Focus 4);
  - удаление — `DELETE /listings/:id/photos/:photoId` с подтверждением.
- **`CropDialog`:** рамка 4:3 поверх фото; перетаскивание фото мышью и пальцем, колесо и ползунок «Масштаб», кнопки «Повернуть влево / вправо», стрелки двигают на 10 px (с Shift — 50), `+`/`-` масштаб; «Применить», «Отмена».
- **`PhotoGrid` + `reorder.ts`:** сетка миниатюр в рамках 1px радиус 14px; первая с меткой «Обложка». Перетаскивание (pointer events, фото приподнимается и наклоняется) и клавиатура (пробел — взять, стрелки — двигать, пробел — поставить, Esc — вернуть) с объявлениями «Фото 3 из 5, теперь на месте 1» в `aria-live`; кнопки «Раньше», «Позже», «Сделать обложкой». Новый порядок — `PUT /listings/:id/photos/order` с `ids` и `version`.

- [ ] **Step 1: Write the failing tests**

```ts
// image-edit.test.ts: fitCrop(4000×3000) → вся картинка; fitCrop(3000×4000) → по ширине, по центру; после поворота на 90 стороны меняются;
//   moveCrop не выводит рамку за край; zoomCrop не меньше 1 и не больше 8
// reorder.test.ts: move(['a','b','c'], 2, 0) → ['c','a','b']; makeCover
// upload-photo.test.ts (фейковый XHR): прогресс 0→50→100; 401 → refreshOnce и повтор один раз; 503 STORAGE_DISABLED → ApiError
// PhotosStep.test.tsx: SVG-файл → текст UNSUPPORTED_MEDIA без запроса; 11 МБ → PAYLOAD_TOO_LARGE; 9-е → PHOTO_LIMIT;
//   ответ 503 → баннер про хранилище и выключенная зона (Review Focus 4)
// PhotoGrid.test.tsx: пробел, стрелка влево, пробел → PUT order с новым порядком и объявление в aria-live; «Сделать обложкой»
// e2e: загрузить два фото (одно через обрезку с поворотом) → обложка; переставить клавиатурой → после перезагрузки порядок тот же;
//   HTML под видом .jpg → текст ошибки API у файла
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): listing photos with client-side crop and rotate, upload progress and keyboard reordering`.

---

### Task 4: Цена и правила

**Files:**
- Create: `steps/{PriceStep,RulesStep}.tsx`.
- Test: рядом.

**Interfaces:**
- **«Цена»:** цена в день (€), скидка от 7 дней (%), залог (€), минимальный и максимальный срок (дней). Ошибки — по `checkListing` (границы из `PRICING_LIMITS`), у поля и сразу при уходе с него. Блок «Вы получите»: за 1 день и за 7 дней (или за минимальный срок, если он больше), посчитано `quote` из `@yoyo/domain` — владелец получает аренду (`ownerPayoutCents`), сбор платит арендатор и в пример не входит (его процент — настройка сервера без публичного маршрута). Пояснение «залог возвращается арендатору после возврата вещи».
- **«Правила и публикация»:** флажки `RULE_PRESETS` (тексты `listingRules.*`), свои правила — до 5 полей по 3–120 символов с кнопками «Добавить правило» и «Убрать»; ниже `SubmitPanel` (Task 6).

- [ ] **Step 1: Write the failing tests**

```ts
// PriceStep.test.tsx: «0,50» → ошибка priceRange и PATCH без dailyCents; «12,50» → dailyCents 1250;
//   minDays 5, maxDays 3 → maxBelowMin; пример за 7 дней учитывает скидку 10 % (как quote)
// RulesStep.test.tsx: отмеченный флажок → rules.preset; шестого своего правила добавить нельзя; правило «ok» → tooShort
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): price step checked by the domain rules, and listing rules`.

---

### Task 5: Где и когда: карта, поиск адреса, календарь недоступности

**Files:**
- Create: `apps/web/src/lib/listings/calendar.ts`, `steps/{PlaceStep,LocationMap,AddressSearch,UnavailabilityCalendar}.tsx`.
- Modify: `apps/web/package.json` (`leaflet`, `@types/leaflet`).
- Test: рядом.

**Interfaces:**
- **`AddressSearch`** — комбобокс WAI-ARIA (`role="combobox"`, список `listbox`, стрелки, Enter, Esc): запрос `GET /geo/search?q=&lang=` через 400 мс после ввода от 2 символов; варианты — `label`; выбор ставит точку и заполняет город и район. Пусто — «Ничего не нашли»; `GEO_UNAVAILABLE` и `429` — текст ошибки. Подпись `attribution` под списком.
- **`LocationMap`** (динамический импорт Leaflet, `ssr: false`): плитки OSM, атрибуция Leaflet включена; своя метка-наклейка (`divIcon`, без картинок Leaflet); клик по карте и перетаскивание метки ставят точку; после установки `GET /geo/reverse` подставляет город и район (если человек их ещё не правил вручную). Кнопка «Поставить точку в центр карты». Подпись «Точный адрес видите только вы. В объявлении — только район». Карта по умолчанию — Рига.
- **Поля «Город» и «Район»** можно поправить руками (их видят все).
- **`calendar.ts`:** `monthGrid(year, month, weekStartsOn)`, `today(timeZone)`, `toggleDay(periods, day)`, `toggleRange(periods, start, end)`, `isUnavailable(periods, day)`; периоды склеиваются так же, как на сервере.
- **`UnavailabilityCalendar`:** два месяца на компьютере, один на телефоне; листание месяцев; клик — день, Shift+клик или «Отметить период» — диапазон; прошедшие дни выключены; неделя с понедельника (по языку — `Intl.Locale.weekInfo`, иначе понедельник). Сохранение — `PUT /listings/:id/unavailability` с `version` через 700 мс после последнего клика; ответ подменяет периоды (сервер склеил их и отбросил прошедшие). Выбранные дни: заливка Soft Mist, зачёркивание, `aria-pressed`. Список «Недоступно: 1–5 дек.» под календарём, каждый период можно убрать.

- [ ] **Step 1: Write the failing tests**

```ts
// calendar.test.ts: monthGrid(2026, 11) начинается с понедельника 30 ноября; toggleDay на краю периода режет его; [1–5]+[4–8] → [1–8]
// UnavailabilityCalendar.test.tsx: стрелки двигают фокус по дням, PageDown — следующий месяц; Enter отмечает день → PUT с periods и version;
//   прошедший день aria-disabled
// AddressSearch.test.tsx: ввод «Brīvības» → один GET /geo/search; стрелка вниз и Enter → lat/lng и «Rīga», «Centrs»; 503 → текст GEO_UNAVAILABLE
// PlaceStep.test.tsx: подпись OpenStreetMap видна; превью после выбора показывает район, координат в разметке превью нет (Review Focus 3)
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): place step with a free map, address search and an unavailability calendar`.

---

### Task 6: Отправка на модерацию и состояния объявления

**Files:**
- Create: `steps/SubmitPanel.tsx`, `apps/web/src/components/listings/ListingActions.tsx`.
- Modify: `ListingBuilder.tsx` (баннер состояния), `apps/web/e2e/listing-builder.spec.ts`.
- Test: рядом; e2e.

**Interfaces:**
- **`SubmitPanel`:** «Что осталось» по `checkListing(…, 'submit')` (ссылки на шаги) и кнопка «Отправить на модерацию» (`POST /listings/:id/submit` после `flush`). `LISTING_INCOMPLETE` с сервера — тот же список по `fields` и `details.steps`. Успех — тост и переход в «Мои вещи».
- **Баннер состояния в конструкторе** (`ListingStatusBadge` + текст):
  - черновик: «Черновик сохраняется сам»;
  - на модерации: «Проверяем объявление. Любая правка оставит его в очереди»;
  - отклонено: причина администратора, «Исправьте и отправьте снова», ссылка на первый связанный шаг;
  - опубликовано: «Правка названия, описания, категории, характеристик, состояния, фото, своих правил, города или района снова отправит объявление на модерацию. Цена, залог, сроки, готовые правила, точка и даты — нет»; кнопка «Скрыть»;
  - скрыто: «Не видно в каталоге»; кнопка «Показать снова»;
  - удалено: только чтение, без автосохранения.
- **`ListingActions`** (общие с «Моими вещами»): скрыть, показать, удалить (диалог: «удалится вместе с фото» для неопубликованного, «уйдёт в архив» для опубликованного; `DELETE /listings/:id`).

- [ ] **Step 1: Write the failing tests**

```ts
// SubmitPanel.test.tsx: без фото и цены — «Что осталось: Фото, Цена» со ссылками ?step=photos/price, кнопка выключена;
//   сервер отвечает LISTING_INCOMPLETE { fields: { 'attributes.model': 'Required' }, details: { steps: ['attributes'] } } → ссылка на «Характеристики»
// ListingBuilder.test.tsx: REJECTED показывает причину и ссылку; PUBLISHED показывает предупреждение и «Скрыть»; ARCHIVED — поля только для чтения
// e2e: новый пользователь проходит все шаги (фото, категория, характеристики, цена, адрес из поиска, два дня в календаре, правило) →
//   «Отправить» → статус «На модерации» в «Моих вещах»; перезагрузка в середине — значения на месте (автосохранение)
// e2e: две вкладки одного объявления — правка во второй после первой → сообщение о конфликте (Review Focus 2)
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): submit a listing for review and show every listing state in the builder`.

---

### Task 7: «Мои вещи»

**Files:**
- Create: `apps/web/src/app/[locale]/dashboard/lending/page.tsx`, `apps/web/src/components/listings/{MyListings,MyListingCard}.tsx`, `apps/web/e2e/my-listings.spec.ts`.
- Test: рядом; e2e.

**Interfaces:**
- **`/dashboard/lending`** (`RequireSession`): заголовок «Мои вещи», кнопка «Сдать вещь», фильтр-пилюли по статусам (все, черновики, на модерации, опубликованы, отклонены, скрыты, архив — архив запрашивается отдельно, `status=ARCHIVED`), фильтр хранится в `?status=`.
- **`MyListingCard`:** обложка (`thumb`/`card`) в рамке или заглушка «Нет фото», название или «Без названия», статус, цена в день, «изменено …» по языку; у отклонённого — причина и кнопка «Исправить» (ведёт на первый шаг из причины или `basics`); действия `ListingActions`. Карточка наклоняется под курсором.
- **Состояния:** скелетоны при загрузке; ошибка с «Попробовать снова»; пусто — наклейка и «Сдайте первую вещь» (для фильтра — «Здесь пока ничего»).

- [ ] **Step 1: Write the failing tests**

```ts
// MyListings.test.tsx: пусто → наклейка и ссылка /listings/new; REJECTED → причина и «Исправить»; фильтр «Архив» → GET /me/listings?status=ARCHIVED;
//   разметка карточек не содержит координат (Review Focus 3)
// e2e: черновик через API → в «Моих вещах», удалить → пропал; опубликованное (через администратора) → «Скрыть» → статус «Скрыто»
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): my listings page with status filters and actions`.

---

### Task 8: Очередь модерации для администратора

**Files:**
- Create: `apps/web/src/app/[locale]/admin/{layout.tsx,listings/page.tsx}`, `apps/web/src/components/admin/{ModerationQueue,ModerationCard,RejectDialog}.tsx`, `apps/web/e2e/moderation.spec.ts`.
- Test: рядом; e2e.

**Interfaces:**
- **`/admin/listings`** (`RequireSession` + `RequireRole('ADMIN')`, `robots: noindex`): очередь `GET /admin/listings?status=PENDING_REVIEW&page=`, старые первыми, «Показано 1–20 из N», страницы «Назад / Дальше».
- **`ModerationCard`:** фото (миниатюры, по клику — `full` в диалоге), название, категория (путь), состояние, описание, характеристики с подписями, цена, залог, сроки, правила, город и район (без точки), владелец (имя, email), «на модерации с …». Кнопки «Одобрить» и «Отклонить».
- **Решение** уходит с `version` объявления, показанного на экране. `409 INVALID_STATUS` → «Владелец изменил объявление, пока вы его смотрели» и обновление очереди; `403` (своё объявление) → текст `errors.AUTH_FORBIDDEN`.
- **`RejectDialog`:** причина 10–500 символов со счётчиком, готовые подсказки-пилюли («Фото не показывают вещь», «Описание не совпадает с категорией», «Запрещённая вещь») дописывают текст, причина видна владельцу и уходит ему письмом.
- После решения карточка уходит из списка с анимацией, тост «Опубликовано» / «Отклонено».

- [ ] **Step 1: Write the failing tests**

```ts
// ModerationQueue.test.tsx: approve шлёт { version: 3 } показанной версии (Review Focus 2); 409 → текст и повторный GET очереди;
//   пустая очередь → «Очередь пуста»; причина из 5 символов → ошибка tooShort, запроса нет
// e2e: владелец отправляет → администратор отклоняет с причиной → владелец видит причину в «Моих вещах» и в конструкторе,
//   исправляет и отправляет снова → администратор одобряет → «Опубликовано»
// e2e: обычный пользователь на /admin/listings видит «Нет доступа», запроса к /api/v1/admin/listings нет (Review Focus 1)
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): moderation queue for administrators`.

---

### Task 9: Доступность, телефон, переводы, документация

**Files:**
- Create: `apps/web/e2e/listings-a11y.spec.ts`.
- Modify: `apps/web/messages/{en,lv,ru}.json` (вычитать), `README.md` (раздел «Объявления → Экраны»), `docs/superpowers/plans/2026-11-03-yoyo-roadmap.md` (статус 6b).
- Test: axe и проверка ширины на новых страницах.

- [ ] **Step 1: Write the failing tests:**
  - axe без serious и critical на каждом шаге конструктора, «Моих вещах» и очереди модерации, в светлой и тёмной теме, на 390px и 1280px; открытые диалоги обрезки и отклонения тоже;
  - на 390px `scrollWidth <= innerWidth`;
  - сценарий «создать и отправить» с клавиатуры: фото выбирается через кнопку, порядок — клавишами, точка — поиском, дни — стрелками и Enter (Review Focus 5);
  - на LV и RU длинные строки не ломают шаги и кнопки.
- [ ] **Step 2–4:** RED → правки → GREEN. Полный прогон `pnpm turbo run lint typecheck test build` и `pnpm --filter @yoyo/web e2e`.
- [ ] **Step 5: Commit.** `chore(web): listings screens pass axe in both themes and on phones; docs`.

---

## Self-Review (выполнено при написании)

- **Покрытие спецификации:**
  - §4.3 шаги: фото (Task 3), основное и характеристики (Task 2), цена (Task 4), где и когда (Task 5), правила и публикация (Task 4, 6); живое превью (Task 2). Подсказка цены по похожим вещам требует каталога — план 7.
  - §4.8 модерация: Task 8. Скрытие объявления администратором, жалобы и редактор категорий — план 11.
  - §4.2 «Мои вещи»: Task 7. «Сдана до…» появится со сделками (план 8).
  - §4.9 состояния, темы, телефон, доступность: во всех задачах, итог — Task 9.
- **Связь с API плана 6:** `version` в `PATCH`, перестановке фото и календаре; `details.steps` у `LISTING_INCOMPLETE`; `version` в решениях модерации; `503 STORAGE_DISABLED`; подпись OpenStreetMap; точка только у владельца.
- **Согласованность имён:** `useListingDraft`, `checkListing`, `parseEuros`, `uploadPhoto`, `RequireRole`, `ListingStatusBadge`, `ListingPreview`, `PhotoGrid`, `UnavailabilityCalendar`, `ModerationQueue` одинаковы во всех задачах.
