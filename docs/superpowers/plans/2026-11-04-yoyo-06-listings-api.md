# Yoyo — План 6: Объявления, API. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Серверная часть объявлений:
- дерево категорий с характеристиками на EN/LV/RU;
- черновики с автосохранением;
- фото: хранилище, проверка файлов, порядок, обложка;
- цена, проверенная ядром из плана 4;
- место и календарь недоступности;
- отправка на модерацию; модерация администратором с письмом владельцу;
- поиск адреса для точки на карте.

Экраны конструктора — план 6b, после плана 5. Публичная карточка и каталог — план 7.

**Architecture:** новые модули NestJS `categories`, `listings`, `media`, `moderation`, `geo`.
- **Категории** — справочные данные из файла в коде. Идемпотентный `ensureCategories()` запускается при старте API, как `ensureAdmin`, поэтому в production они есть без ручного сида.
- **Фото** идут через API за интерфейсом `StorageProvider`:
  - в production — Cloudinary через его REST API с подписью;
  - в разработке и тестах — локальный диск с перекодированием через `sharp`, который убирает метаданные, в том числе GPS.
- **Правила цены и периодов** берутся из `@yoyo/domain` (`validatePricing`, `period`, `validateRentalPeriod`), а не дублируются.
- **Точные координаты** видит только владелец и администратор.

**Tech Stack:**
- уже есть: NestJS 11, Prisma 7, zod, `@yoyo/domain`;
- новое: `sharp` (только сервер; prebuilt-бинарники, без скриптов установки — проверить `allowBuilds`), загрузка через `FileInterceptor` из `@nestjs/platform-express` с лимитами;
- Cloudinary без SDK, через `fetch` и подпись SHA-1;
- геокодинг через Nominatim (OpenStreetMap) с кэшем.

**Spec:** [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md):
- §0;
- §4.3 (конструктор);
- §4.8 (категории, модерация);
- §5 (файлы, безопасность);
- §6 (`Category`, `CategoryAttribute`, `Listing`, `ListingPhoto`, `ListingAttributeValue`, `Unavailability`).

Зависит от слитых планов 3 (PR #1) и 4 (PR #2).

## Global Constraints

**Общие**
- Действуют правила планов 1, 3 и 4: TypeScript strict, формат ошибок `{ error: { code, message, fields? } }`, `AuthGuard` и `@CurrentUser()`, `RolesGuard`, `Clock`, проверка Origin, три языка, политика pnpm.

**Статусы объявления**
- `DRAFT` (черновик), `PENDING_REVIEW` (на модерации), `PUBLISHED` (опубликовано), `REJECTED` (отклонено, причина видна владельцу), `HIDDEN` (скрыто владельцем), `ARCHIVED` (удалено, но хранится ради будущих сделок).
- Переходы задаёт только таблица из Task 2.

**Права и доступ**
- Чужое объявление для пользователя не существует: на любые действия с ним 404 `NOT_FOUND`, а не 403.
- Администратор видит всё и модерирует.

**Координаты**
- `lat` и `lng` хранятся с точностью до 6 знаков.
- В ответах владельцу и администратору они есть, во всех остальных (план 7) их нет. Публично показывается только `district`.

**Фото**
- **Ограничения:** до 8 на объявление, до 10 МБ, только JPEG, PNG и WebP. Тип проверяется по сигнатуре файла, а не по `Content-Type`; SVG и всё остальное отклоняется (`415 UNSUPPORTED_MEDIA`).
- **Обработка:**
  - длинная сторона уменьшается до 2048px;
  - метаданные удаляются;
  - первая по порядку фотография — обложка.
- **Ответ** содержит адреса трёх вариантов: `thumb` 160×120, `card` 640×480 cover, `full` до 2048px.

**Тексты**
- `title` 5–80, `description` 30–3000, свои правила — до 5 штук по 3–120 символов.
- Весь пользовательский текст очищается от HTML.

**Хранилище и геокодинг**
- `STORAGE` = `local` (по умолчанию в dev/test) или `cloudinary`. Для `cloudinary` нужен `CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>`.
- В production без хранилища API стартует, но загрузка фото отвечает `503 STORAGE_DISABLED`.
- Nominatim запрашивается не чаще 1 раза в секунду на весь сервер. Заголовок `User-Agent: Yoyo/1.0 (+https://yoyo.rent)`. Ответы кэшируются на 30 дней. Подпись «© OpenStreetMap contributors» отдаётся в ответе для показа на сайте.

**Новые коды ошибок** (`ERROR_CODES`): `UNSUPPORTED_MEDIA`, `PAYLOAD_TOO_LARGE`, `PHOTO_LIMIT`, `STORAGE_DISABLED`, `LISTING_INCOMPLETE`, `INVALID_STATUS`, `GEO_UNAVAILABLE`.

## Review Focus

1. **Чужое объявление (IDOR).** Пользователь B пытается прочитать, изменить, отправить на модерацию, удалить, добавить или переставить фото и задать даты в объявлении пользователя A. Ожидание: 404 везде, данные не меняются. Тест в Task 2 и Task 3.
2. **Вредный файл:**
   - HTML или SVG с `Content-Type: image/jpeg`;
   - файл 11 МБ;
   - девятая фотография;
   - JPEG с GPS в EXIF.
   Ожидание: 415, 413, 409 `PHOTO_LIMIT`; у сохранённого фото нет EXIF и GPS. Тест в Task 3.
3. **Характеристики не той категории.** Отправка без обязательной характеристики, с неверным типом, со значением не из списка или с ключом из другой категории. Ожидание: 400 с `fields` по каждой характеристике. Тест в Task 1 и Task 4.
4. **Обход модерации.** Правка заголовка опубликованного объявления, одобрение объявления не на модерации, попытка владельца одобрить своё. Ожидание: снова `PENDING_REVIEW`; `409 INVALID_STATUS`; `403 AUTH_FORBIDDEN`. Тест в Task 2 и Task 5.
5. **Утечка координат.** Точные `lat` и `lng` не видны никому, кроме владельца и администратора. Это зафиксировано тестом сериализатора и пригодится плану 7. Тест в Task 2.

---

## Структура файлов (итог плана)

```
packages/shared/src/{categories.ts,listings.ts}            zod-схемы, статусы, validateAttributes
apps/api/src/categories/{categories.module,categories.controller,categories.service,catalog-data.ts,ensure-categories.ts}
apps/api/src/listings/{listings.module,listings.controller,listings.service,listing-status.ts,listing.serializer.ts}
apps/api/src/media/{media.module,storage.provider.ts,local-storage.provider.ts,cloudinary-storage.provider.ts,image-check.ts,media.controller.ts}
apps/api/src/moderation/{moderation.module,moderation.controller,moderation.service}.ts + mail templates ListingApproved/ListingRejected
apps/api/src/geo/{geo.module,geo.controller,geo.service,nominatim.client}.ts
apps/api/prisma/schema.prisma (+ migration listings)
apps/api/test/{categories,listings,photos,moderation,geo}.e2e.test.ts · test/support/{fake-cloudinary,fake-nominatim,images}.ts
```

---

### Task 1: Категории и характеристики

**Files:**
- Create: `packages/shared/src/categories.ts`, `apps/api/src/categories/*`.
- Modify: `schema.prisma`, migration `listings` (общая на план, одна миграция), `app.module.ts`.
- Test: `packages/shared/src/categories.test.ts`, `apps/api/test/categories.e2e.test.ts`.

**Interfaces:**
- **Модели:**
  - `Category { id, slug @unique, parentId?, sortOrder, sticker (enum из STICKER_COLORS), icon String, names Json {en,lv,ru}, active Boolean }`;
  - `CategoryAttribute { id, categoryId, key, type AttributeType(TEXT|NUMBER|BOOLEAN|SELECT), required, unit?, labels Json, options Json? [{ value, labels }], sortOrder, @@unique([categoryId, key]) }`.
- **`catalog-data.ts`.** Верхний уровень (наклейка в скобках):
  - Electronics (blue): игровые приставки, фото и видео, аудио, ноутбуки и планшеты, проекторы, дроны;
  - Tools (sun): электроинструмент, ручной инструмент, садовый, измерительный, лестницы и леса, уборочная техника;
  - Sports & outdoors (mint): велосипеды и самокаты, кемпинг, зимний спорт, водный спорт, фитнес;
  - Home & kitchen (lavender): кухонная техника, уборка, мебель;
  - Events & party (ember): оборудование для праздников, звук и свет, шатры и мебель, костюмы;
  - Kids (violet): коляски и автокресла, игрушки и игры, детская мебель;
  - Music (blue): инструменты, DJ-оборудование;
  - Car & travel (sun): боксы и багажники, туристическое снаряжение, автоинструмент.
- **Характеристики:** у каждой подкатегории 2–5 характеристик. Например:
  - приставка — модель (SELECT), контроллеров (NUMBER), игры в комплекте (TEXT);
  - электроинструмент — питание (SELECT: сеть или аккумулятор), мощность (NUMBER, W), в комплекте (TEXT);
  - велосипед — тип (SELECT), размер рамы (TEXT), шлем в комплекте (BOOLEAN).
  Названия на трёх языках обязательны (тест сверяет). Полный набор — решение исполнителя с ruling.
- **`ensureCategories(prisma)`:**
  - вызывается из `onApplicationBootstrap`;
  - upsert по `slug`;
  - лишние категории не удаляет, а помечает `active=false`;
  - безопасен при одновременном старте двух экземпляров.
- **`GET /api/v1/categories`** (публично, `Cache-Control: public, max-age=300`) → `{ categories: CategoryNode[] }`, только `active`. `CategoryNode = { id, slug, sticker, icon, names, attributes: AttributeDef[], children: CategoryNode[] }`.
- **`validateAttributes(values: Record<string, unknown>, defs: AttributeDef[], mode: 'draft' | 'submit'): { ok: true; value } | { ok: false; fields: Record<string, string> }`:**
  - `submit` требует все обязательные характеристики;
  - `draft` разрешает пропуски;
  - лишние ключи — ошибка в обоих режимах.

- [ ] **Step 1: Write the failing tests:**
  - дерево отдаётся по-детски вложенным, неактивных категорий нет;
  - повторный `ensureCategories` ничего не дублирует;
  - `validateAttributes`: обязательная пропущена, NUMBER из строки, SELECT вне списка, лишний ключ → свои `fields` (Review Focus 3);
  - у каждой категории и характеристики есть en, lv и ru.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): category tree with attributes in three languages`.

---

### Task 2: Объявления: черновик, правка, статусы, сериализация

**Files:**
- Create: `packages/shared/src/listings.ts`, `apps/api/src/listings/*`.
- Modify: `schema.prisma`.
- Test: `apps/api/test/listings.e2e.test.ts`, `listing-status.test.ts`.

**Interfaces:**
- **Модели:**
  - `Listing { id, ownerId, categoryId?, status ListingStatus, title?, description?, condition? (NEW|LIKE_NEW|GOOD|FAIR), attributes Json default {}, dailyCents?, weeklyDiscountPercent default 0, depositCents default 0, minDays default 1, maxDays default 30, city?, district?, lat Decimal(9,6)?, lng Decimal(9,6)?, timeZone default "Europe/Riga", rules Json default {preset:[],custom:[]}, rejectionReason?, submittedAt?, reviewedAt?, reviewedById?, publishedAt?, version Int default 0, createdAt, updatedAt }`;
  - `ListingPhoto { id, listingId, storageKey @unique, width, height, bytes, format, position }`;
  - `Unavailability { id, listingId, start Date, end Date }`;
  - индексы `(ownerId)`, `(status, categoryId)`; `onDelete: Cascade` от `Listing`.
- **Набор правил:** `RULE_PRESETS` в shared — `ID_AT_PICKUP`, `RETURN_CLEAN`, `NO_SMOKING`, `PICKUP_ONLY`, `PETS_OK`, `CARE_INSTRUCTIONS`, с подписями на трёх языках в сообщениях сайта.
- **Эндпоинты** (все требуют вход):
  - `POST /listings` → 201 `{ listing }` в `DRAFT`, тело — любые поля черновика;
  - `GET /me/listings?status=` → `{ items: OwnerListingSummary[] }`, обложка, статус, причина отказа;
  - `GET /listings/:id` → `{ listing: OwnerListing }`, только владельцу и администратору;
  - `PATCH /listings/:id` → частичное обновление по `ListingDraftSchema`. Поле `version` из тела проверяется: устарело → `409 INVALID_STATUS` с `details.currentVersion`, чтобы две вкладки не затирали друг друга;
  - `DELETE /listings/:id`: `DRAFT` и `REJECTED` удаляются физически вместе с файлами фото, `PUBLISHED` и `HIDDEN` переходят в `ARCHIVED`.
- **Таблица статусов** (`listing-status.ts`, чистая функция `nextStatus(current, action, change?)`):

  | Из | Действие | В |
  |---|---|---|
  | DRAFT, REJECTED | submit (Task 4) | PENDING_REVIEW |
  | PENDING_REVIEW | approve / reject (Task 5) | PUBLISHED / REJECTED |
  | PUBLISHED | hide (Task 4) | HIDDEN |
  | HIDDEN | unhide (Task 4) | PUBLISHED |
  | PUBLISHED, HIDDEN | правка содержания: название, описание, категория, характеристики, состояние, фото | PENDING_REVIEW |
  | PUBLISHED, HIDDEN | правка цены, правил, дат, места | без изменения |
  | PUBLISHED, HIDDEN | delete | ARCHIVED |
  | PENDING_REVIEW | любая правка | PENDING_REVIEW (submittedAt обновляется) |
  | ARCHIVED | всё | `409 INVALID_STATUS` |

- **`serializeListing(listing, viewer: 'owner' | 'admin' | 'public')`.** Для `public` нет `lat`, `lng`, `rejectionReason`, `reviewedById`. Этот режим пригодится плану 7 (Review Focus 5).

- [ ] **Step 1: Write the failing tests:**
  - черновик создаётся с минимумом полей и видит его только владелец, B получает 404 на GET, PATCH и DELETE (Review Focus 1);
  - правка заголовка `PUBLISHED` → `PENDING_REVIEW`, правка цены → остаётся `PUBLISHED` (Review Focus 4);
  - устаревший `version` → 409;
  - `serializeListing(..., 'public')` не содержит `lat` и `lng` (Review Focus 5).
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): listing drafts with owner-only access, status rules and optimistic locking`.

---

### Task 3: Фото: хранилище, проверка, порядок

**Files:**
- Create: `apps/api/src/media/*`, `apps/api/test/support/{fake-cloudinary,images}.ts`.
- Test: `apps/api/test/photos.e2e.test.ts`, `image-check.test.ts`, `cloudinary-storage.provider.test.ts`.

**Interfaces:**
- **`interface StorageProvider`:**
  - `put(key: string, data: Buffer, mime: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<{ width; height; bytes; format }>`;
  - `delete(key: string): Promise<void>`;
  - `url(key: string, variant: 'thumb' | 'card' | 'full'): string`.
  Токен `STORAGE_PROVIDER`.
- **`LocalStorageProvider`:**
  - `sharp(data).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 })` — поворот по EXIF, затем EXIF удаляется;
  - файлы лежат в `apps/api/.uploads` (в `.gitignore`);
  - `GET /api/v1/media/:key/:variant` отдаёт варианты, уменьшая на лету с кэшем.
- **`CloudinaryStorageProvider`:**
  - `POST https://api.cloudinary.com/v1_1/<cloud>/image/upload` с полями `file`, `public_id`, `folder=yoyo/listings`, `api_key`, `timestamp`, `signature = sha1(<sorted params>&<secret>)`;
  - `transformation=c_limit,w_2048,h_2048` (Cloudinary при этом убирает метаданные);
  - удаление через `/image/destroy`;
  - URL вида `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_fill,w_640,h_480/<public_id>`.
  - В тестах — `fake-cloudinary.ts` (локальный HTTP-сервер), подпись проверяется.
- **`checkImage(buf): { mime } | ApiError`:** сигнатуры JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`; `sharp(buf).metadata()` должен открыть файл.
- **Эндпоинты:**
  - `POST /listings/:id/photos` — multipart, поле `file`, лимит 10 МБ на уровне multer → 201 `{ photo }`;
  - `DELETE /listings/:id/photos/:photoId` → 204;
  - `PUT /listings/:id/photos/order` с `{ ids: string[] }` (ровно все фото объявления) → `{ photos }`.
  - Изменение фото опубликованного объявления — это правка содержания (Task 2).
- **Ключи** — случайные (`crypto.randomUUID()`), имя файла пользователя нигде не используется.

- [ ] **Step 1: Write the failing tests** (Review Focus 2)

```ts
await upload(listing, images.htmlAsJpeg).expect(415);                   // HTML с Content-Type image/jpeg
await upload(listing, images.svg).expect(415);
await upload(listing, images.big11mb).expect(413);
for (let i = 0; i < 8; i++) await upload(listing, images.jpeg).expect(201);
expect((await upload(listing, images.jpeg)).body.error.code).toBe('PHOTO_LIMIT');   // 409
const saved = await sharp(readLocalFile(photo.storageKey)).metadata();
expect(saved.exif).toBeUndefined();                                     // GPS из исходного файла не сохранился
await uploadAs(otherUser, listing, images.jpeg).expect(404);            // Review Focus 1
// порядок: PUT order с неполным списком → 400; первая после перестановки — обложка
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): listing photos with signature checks, metadata stripping and Cloudinary storage`.

---

### Task 4: Отправка на модерацию, скрытие, календарь недоступности

**Files:**
- Modify: `listings.controller.ts`, `listings.service.ts`.
- Test: `apps/api/test/listings.submit.e2e.test.ts`.

**Interfaces:**
- **`POST /listings/:id/submit`** — проверка `ListingSubmitSchema`:
  - есть название, описание, состояние и **конечная** категория (без детей);
  - `validateAttributes(..., 'submit')`;
  - `validatePricing` из `@yoyo/domain`;
  - 1–8 фото, город, район, точка;
  - не прошло → `400 LISTING_INCOMPLETE` с `fields` по шагам;
  - прошло → `PENDING_REVIEW`, `submittedAt`.
- **`POST /listings/:id/hide`, `POST /listings/:id/unhide`** — по таблице Task 2.
- **`PUT /listings/:id/unavailability`** с `{ periods: { start: LocalDate; end: LocalDate }[] }`:
  - до 50 периодов;
  - каждый проверяется `period()` из `@yoyo/domain`;
  - пересекающиеся периоды склеиваются, полностью прошедшие отбрасываются;
  - заменяет весь набор;
  - ответ `{ periods }`.

- [ ] **Step 1: Write the failing tests:**
  - отправка без фото, без точки или с неполными характеристиками → `LISTING_INCOMPLETE` и нужные `fields` (Review Focus 3);
  - категория верхнего уровня → ошибка;
  - цена вне лимитов ядра → ошибка поля `dailyCents`;
  - периоды `[1–5]` и `[4–8]` → `[1–8]`;
  - `end < start` → 400.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): submit for review, hide and unavailable dates`.

---

### Task 5: Модерация и письма владельцу

**Files:**
- Create: `apps/api/src/moderation/*`, mail templates `ListingApproved.tsx`, `ListingRejected.tsx` + i18n.
- Test: `apps/api/test/moderation.e2e.test.ts`.

**Interfaces:**
- Только `@Roles('ADMIN')`:
  - `GET /admin/listings?status=PENDING_REVIEW&page=` → `{ items: AdminListing[], total }`, 20 на страницу, старые первыми;
  - `POST /admin/listings/:id/approve` → `PUBLISHED`, `publishedAt`, `reviewedAt`, `reviewedById`;
  - `POST /admin/listings/:id/reject` с `{ reason: string 10–500 }` → `REJECTED`, `rejectionReason`.
- Не из `PENDING_REVIEW` → `409 INVALID_STATUS`.
- Письмо владельцу на его языке: одобрено (ссылка на объявление) или отклонено (причина и ссылка на правку). Отправка через `MailService` с бюджетом писем из ревью плана 3.

- [ ] **Step 1: Write the failing tests:**
  - обычный пользователь → 403 (Review Focus 4);
  - одобрение `DRAFT` → 409;
  - отклонение без причины → 400;
  - после одобрения письмо в Mailpit на языке владельца;
  - после отклонения владелец видит причину в `GET /me/listings`.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): listing moderation with owner emails`.

---

### Task 6: Поиск адреса

**Files:**
- Create: `apps/api/src/geo/*`, `apps/api/test/support/fake-nominatim.ts`.
- Modify: `schema.prisma` (`GeoCache { key @id, payload Json, createdAt }`).
- Test: `apps/api/test/geo.e2e.test.ts`.

**Interfaces:**
- Env `NOMINATIM_URL`, по умолчанию `https://nominatim.openstreetmap.org` (в тестах подменяется).
- **`GET /geo/search?q=&lang=`** (вход обязателен; 30 запросов в минуту на пользователя) → `{ results: { label, city, district, lat, lng }[], attribution }`, до 5 результатов.
- **`GET /geo/reverse?lat=&lng=&lang=`** → `{ city, district, attribution }`.
- **Общий ограничитель:** не больше 1 запроса в секунду к Nominatim, лишние ждут в очереди до 5 с, потом `503 GEO_UNAVAILABLE`.
- **Кэш:** ключ = нормализованный запрос + язык, срок 30 дней.

- [ ] **Step 1: Write the failing tests:**
  - второй одинаковый запрос не доходит до фейкового Nominatim;
  - три запроса подряд приходят к нему с интервалом не меньше 1 с (Clock);
  - отправлен `User-Agent` с `yoyo.rent`;
  - Nominatim недоступен → 503 `GEO_UNAVAILABLE`.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): address search and reverse geocoding through a cached, rate-limited Nominatim client`.

---

### Task 7: Документация, развёртывание, клиент

**Files:**
- Modify:
  - `render.yaml`: `STORAGE=cloudinary`, `CLOUDINARY_URL` (`sync: false`);
  - `apps/api/.env.example`, `README.md` (раздел «Объявления»: статусы, фото, Cloudinary, модерация, Nominatim и его правила);
  - `apps/api/openapi.json`, `packages/api-client/src/schema.d.ts`.
- Test: полный набор.

- [ ] **Step 1:** Перегенерировать OpenAPI и клиент. В CI проверка расхождения зелёная.
- [ ] **Step 2:** `pnpm turbo run lint typecheck test build`, `pnpm --filter @yoyo/web e2e`, docker-задача CI. API стартует в production без `CLOUDINARY_URL` (загрузка фото → 503).
- [ ] **Step 3: Commit.** `docs: listings API, storage and moderation; deploy env`.

---

## Self-Review (выполнено при написании)

- **Покрытие спецификации:**
  - §4.3 шаги 1–6 (данные и правила): Task 1–4. Подсказка цены по похожим вещам требует каталога — план 7.
  - §4.8 категории (данные; редактор — план 11) и модерация: Task 1, 5.
  - §5 файлы и безопасность: Task 3.
  - §6 сущности: Task 1–3. `ListingAttributeValue` заменён JSON-полем `attributes` с проверкой по определениям — [моё решение]: проще и быстрее для фильтров плана 7 через индекс GIN.
- **Связь с ядром:** `validatePricing`, `period`, `quote` берутся из `@yoyo/domain`.
- **Согласованность имён:** `StorageProvider`, `ensureCategories`, `validateAttributes`, `serializeListing`, `nextStatus`, `ListingDraftSchema`, `ListingSubmitSchema` одинаковы во всех задачах.
