# Yoyo — План 1: Фундамент. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Развёрнутый в интернете скелет Yoyo, на котором строятся планы 2–11. Состав:
- монорепозиторий;
- API со здоровьем и настройками на PostgreSQL;
- веб на трёх языках со светлой и тёмной темой и базовыми компонентами `DESIGN.md`;
- типизированный клиент API;
- CI.

**Architecture:**
- **Репозиторий.** pnpm-workspace + Turborepo: `apps/api` (NestJS + Prisma), `apps/web` (Next.js App Router + Tailwind v4 + next-intl), `packages/shared` (константы и zod-схемы, общие для фронта и бэка), `packages/api-client` (типы из OpenAPI бэкенда + `openapi-fetch`).
- **Темы и анимации.** Тема хранится в cookie, поэтому её видит рендер на сервере, а для варианта «как в системе» есть встроенный скрипт до первой отрисовки. Анимации отключаются при `prefers-reduced-motion`.
- **Хостинг.** Веб на Vercel, API в Docker на бесплатном хостинге с WebSocket, база Neon.

**Tech Stack:** TypeScript (strict), Node ≥ 24, pnpm 12, Turborepo, NestJS + nestjs-zod + @nestjs/swagger, Prisma + PostgreSQL 17, Next.js (App Router), React, Tailwind CSS v4, next-intl, Vitest (+ unplugin-swc для декораторов Nest), Testing Library, Playwright + @axe-core/playwright, openapi-typescript + openapi-fetch, GitHub Actions. Версии библиотек — последние стабильные на момент выполнения, фиксируются lock-файлом.

**Spec:**
- [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md): §3, §5, §8;
- дизайн: [`DESIGN.md`](../../../DESIGN.md);
- дорожная карта: [`2026-11-03-yoyo-roadmap.md`](./2026-11-03-yoyo-roadmap.md).

## Global Constraints

**Технологии**
- TypeScript везде, `strict: true`.
- Монорепозиторий pnpm + Turborepo: `apps/web`, `apps/api`, `packages/*`.
- Имена пакетов: `@yoyo/web`, `@yoyo/api`, `@yoyo/shared`, `@yoyo/api-client`.
- Локальные порты: веб `3000`, API `4000`, PostgreSQL `5432`, Mailpit `1025` (SMTP) и `8025` (интерфейс).
- Базы: `yoyo_dev` и `yoyo_test`.
- Все маршруты API под префиксом `/api/v1`.

**Языки**
- `en` (основной, по умолчанию), `lv`, `ru`.
- Переводы с первого дня: в компонентах нет текста интерфейса, только ключи сообщений.
- Схема URL: `localePrefix: 'as-needed'`. EN без префикса, `/lv/…`, `/ru/…`.

**Дизайн**
- `DESIGN.md` — единственный источник правды; раздел «Project adaptations» важнее референса.
- Шрифты поддерживают Latin Extended (ā č ē ģ ī ķ ļ ņ š ū ž) и кириллицу.
- Временные шрифты подключаются через одно место `apps/web/src/styles/fonts.ts`: Unbounded (заголовки), Onest (текст).
- Контуры 1px сплошные: `#000000` в светлой теме, `#ffffff` в тёмной.
- Радиусы:
  - кнопки, теги и навигация — пилюли (`9999px`);
  - карточки — 20px, выделенные карточки — 40px;
  - фото — не меньше 14px.
- Никаких box-shadow и градиентов.
- Движение:
  - длительность 150–450 ms, кривая `cubic-bezier(.2,.8,.2,1)`;
  - при `prefers-reduced-motion: reduce` анимаций нет;
  - декорации сами не анимируются, постоянно движется только бегущая строка, и она останавливается при наведении.
- Две темы, по умолчанию как в системе.

**Доступность**
- WCAG AA.
- Фокус: outline 2px со смещением 3px.
- Текст на рабочих экранах не меньше 14px.
- Цели касания не меньше 40px.

**Качество и бюджет**
- Бюджет ноль: бесплатные тарифы, по возможности без привязки карты.
- Шрифты, адрес сайта, почтовый провайдер и хостинг меняются настройками, без переделки кода.
- Валюта EUR.
- В интерфейсе нет плашек «учебный режим» или «демо».
- Нет мёртвых кнопок и ссылок, нет текста-рыбы, нет ошибок в консоли браузера.
- Перед любой установкой программ на компьютер (`brew install …`) исполнитель спрашивает владельца. Перед созданием аккаунтов в облачных сервисах тоже, это делает сам владелец.

## Review Focus

1. **Посетитель с тёмной темой в системе или с сохранённой темой.** Ожидание: страница сразу открывается в нужной теме, без вспышки светлой. Тест в Task 5.
2. **Неизвестный язык или язык в неправильном регистре в URL** (`/de`, `/LV`). Ожидание: оформленная страница 404, а не падение и не английский текст под чужим адресом. Тест в Task 4.
3. **Длинные латышские и русские строки на телефоне шириной 390px.** Ожидание: нет горизонтальной прокрутки, текст на кнопках не обрезан. Тест в Task 8.
4. **База данных недоступна.** Ожидание: API не падает; `GET /api/v1/health` отвечает `503` с `{ "status": "degraded", "db": "down" }`. Тест в Task 2.
5. **Пользователь с `prefers-reduced-motion`.** Ожидание: смена темы без анимации, бегущая строка стоит, наклейки не крутятся. Тесты в Task 5 и Task 7.

---

## Структура файлов (итог плана)

```
package.json · pnpm-workspace.yaml · turbo.json · tsconfig.base.json · eslint.config.mjs · .prettierrc · .editorconfig · .nvmrc
.github/workflows/ci.yml
packages/shared/src/{index,locale,theme,settings,status,health}.ts (+ *.test.ts)
packages/api-client/src/{index.ts,schema.d.ts}
apps/api/
  src/main.ts · src/app.module.ts · src/openapi.ts · scripts/emit-openapi.ts
  src/config/env.ts (+ env.test.ts)
  src/prisma/{prisma.module,prisma.service}.ts
  src/health/health.controller.ts (+ health.controller.test.ts)
  src/settings/{settings.module,settings.service}.ts (+ settings.service.test.ts)
  prisma/schema.prisma · prisma/seed.ts · prisma/migrations/*
  test/health.e2e.test.ts · vitest.config.ts · Dockerfile · .env.example
apps/web/
  messages/{en,lv,ru}.json
  src/i18n/{routing,request,navigation}.ts (+ messages.test.ts)
  src/proxy.ts            (в Next < 16 — src/middleware.ts)
  src/styles/{fonts.ts,tokens.css} · src/app/globals.css
  src/app/[locale]/{layout,page,not-found}.tsx · src/app/[locale]/styleguide/page.tsx
  src/components/theme/{theme-script.ts,ThemeProvider.tsx,ThemeToggle.tsx,switch-theme.ts} (+ tests)
  src/components/ui/{Button,IconButton,Chip,Card,Field,StatusBadge,Sticker,Marquee,Wordmark,LogoMark,LanguageSwitcher}.tsx (+ tests)
  src/lib/{motion.ts,api.ts,use-api-health.ts}
  e2e/{home,theme,styleguide}.spec.ts · playwright.config.ts · vitest.config.ts · .env.example
```

---

### Task 1: Монорепозиторий и пакет `@yoyo/shared`

**Files:**
- Create: корневые `package.json` (private, `"packageManager": "pnpm@12.16.1"`, `engines.node ">=24"`, скрипты `dev`, `build`, `lint`, `typecheck`, `test`, `e2e` через `turbo run`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs` (typescript-eslint flat), `.prettierrc` (+ prettier-plugin-tailwindcss), `.editorconfig`, `.nvmrc` (`26`).
- Create: `packages/shared/{package.json,tsconfig.json,vitest.config.ts}`, `src/locale.ts`, `src/theme.ts`, `src/settings.ts`, `src/status.ts`, `src/index.ts`.
- Test: `packages/shared/src/{locale,theme,settings,status}.test.ts`.

**Interfaces:**
- Produces (из `@yoyo/shared`):
  - `LOCALES = ['en','lv','ru'] as const`, `type Locale`, `DEFAULT_LOCALE: Locale = 'en'`, `isLocale(v: string): v is Locale`.
  - `THEME_PREFERENCES = ['system','light','dark'] as const`, `type ThemePreference`, `type ResolvedTheme = 'light'|'dark'`, `THEME_COOKIE = 'yoyo-theme'`, `parseThemePreference(v: string|undefined): ThemePreference`, `resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): ResolvedTheme`.
  - `SETTING_DEFAULTS` (точные значения ниже), `type SettingKey = keyof typeof SETTING_DEFAULTS`.
  - `STICKER_COLORS = { blue: '#4da2ff', mint: '#55db9c', lavender: '#e9ccff', ember: '#fb4903', sun: '#ffd731', violet: '#5c4ade' } as const`, `type StickerColor = keyof typeof STICKER_COLORS`.
  - `STATUS_TONES = ['requested','active','deposit','dispute','completed','cancelled'] as const`, `type StatusTone`, `STATUS_TONE_COLOR: Record<StatusTone, string>`. Связь со статусами сделки появится в плане 6.

- [ ] **Step 1: Write the failing tests**

```ts
// locale.test.ts
expect(LOCALES).toEqual(['en', 'lv', 'ru']);
expect(DEFAULT_LOCALE).toBe('en');
expect(isLocale('ru')).toBe(true);
expect(isLocale('LV')).toBe(false);
expect(isLocale('de')).toBe(false);
// theme.test.ts
expect(resolveTheme('system', true)).toBe('dark');
expect(resolveTheme('system', false)).toBe('light');
expect(resolveTheme('light', true)).toBe('light');
expect(parseThemePreference('purple')).toBe('system');
expect(parseThemePreference(undefined)).toBe('system');
// settings.test.ts — значения из спецификации §4.4
expect(SETTING_DEFAULTS).toEqual({
  'booking.requestTtlHours': 24, 'booking.inspectionHours': 48,
  'booking.damageReplyHours': 48, 'review.windowDays': 14, 'fees.servicePercent': 10,
});
// status.test.ts — цвета из DESIGN.md (палитра и §4)
expect(STICKER_COLORS).toEqual({
  blue: '#4da2ff', mint: '#55db9c', lavender: '#e9ccff', ember: '#fb4903', sun: '#ffd731', violet: '#5c4ade',
});
expect(STATUS_TONE_COLOR).toEqual({
  requested: '#ffd731', active: '#4da2ff', deposit: '#e9ccff',
  dispute: '#fb4903', completed: '#5c4ade', cancelled: '#e9e9e9',
});
```

- [ ] **Step 2: Run tests to verify they fail.** Run: `pnpm install && pnpm --filter @yoyo/shared test`. Expected: FAIL (модули не найдены).
- [ ] **Step 3: Implement the modules listed in Interfaces in `packages/shared/src/*`.** Пакет собирается в ESM с `.d.ts`.
- [ ] **Step 4: Run the full pipeline.** Run: `pnpm turbo run lint typecheck test`. Expected: всё зелёное.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "chore: scaffold pnpm/turbo monorepo with @yoyo/shared"`.

---

### Task 2: API: NestJS, env, Prisma, `/api/v1/health`

**Files:**
- Create: `apps/api/{package.json,tsconfig.json,nest-cli.json,vitest.config.ts,.env.example}`, `src/main.ts`, `src/app.module.ts`, `src/config/env.ts`, `src/prisma/prisma.module.ts`, `src/prisma/prisma.service.ts`, `src/health/health.controller.ts`, `prisma/schema.prisma`.
- Modify: корневой `README.md`: раздел «Локальный запуск» (установка PostgreSQL и Mailpit, `.env`, команды).
- Test: `src/config/env.test.ts`, `src/health/health.controller.test.ts`, `test/health.e2e.test.ts`.

**Interfaces:**
- Consumes: `@yoyo/shared` (пока только для сборки).
- Produces:
  - `loadEnv(source: Record<string, string|undefined>): Env`, где `Env = { NODE_ENV: 'development'|'test'|'production'; PORT: number; DATABASE_URL: string; WEB_ORIGIN: string }`. Значения по умолчанию: `NODE_ENV='development'`, `PORT=4000`. Если значения неверны, функция бросает `Error` и перечисляет **все** неверные ключи.
  - `PrismaService extends PrismaClient` с `isHealthy(): Promise<boolean>`: выполняет `SELECT 1`, а при ошибке возвращает `false`, не бросая исключение.
  - `GET /api/v1/health` → `200 { status:'ok', db:'up', version }` или `503 { status:'degraded', db:'down', version }`. `version` берётся из `apps/api/package.json`.
  - В `main.ts`: `setGlobalPrefix('api/v1')`, CORS с `origin: WEB_ORIGIN, credentials: true`.

- [ ] **Step 1: Подготовить локальную инфраструктуру.**
  - Спросить владельца разрешение на `brew install postgresql@17 mailpit`.
  - После «да» выполнить `brew install postgresql@17 mailpit && brew services start postgresql@17 && brew services start mailpit && createdb yoyo_dev && createdb yoyo_test`.
  - Expected: `psql -d yoyo_dev -c 'select 1'` возвращает `1`.
- [ ] **Step 2: Write the failing tests**

```ts
// env.test.ts
expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
expect(() => loadEnv({})).toThrow(/WEB_ORIGIN/);
expect(loadEnv({ DATABASE_URL: 'postgresql://localhost:5432/yoyo_test', WEB_ORIGIN: 'http://localhost:3000' }))
  .toMatchObject({ PORT: 4000, NODE_ENV: 'development' });
// health.controller.test.ts — база недоступна (Review Focus 4)
const prisma = { isHealthy: vi.fn().mockResolvedValue(false) };
// GET /api/v1/health через Test.createTestingModule + supertest → 503, body { status: 'degraded', db: 'down' }
// health.e2e.test.ts — настоящая yoyo_test
// GET /api/v1/health → 200, body toMatchObject({ status: 'ok', db: 'up' }), typeof body.version === 'string'
```

- [ ] **Step 3: Run tests to verify they fail.** Run: `pnpm --filter @yoyo/api test`. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - Модули из Interfaces.
  - Vitest с `unplugin-swc`, чтобы работали метаданные декораторов Nest.
  - `prisma/schema.prisma`: datasource `postgresql`, генератор клиента по документации установленной мажорной версии Prisma (для v7+ это `prisma-client` с явным `output` и `@prisma/adapter-pg`).
  - `.env.example`:
    - `DATABASE_URL=postgresql://localhost:5432/yoyo_dev`;
    - `WEB_ORIGIN=http://localhost:3000`;
    - `PORT=4000`.
  - Тестам передаётся `DATABASE_URL` с базой `yoyo_test`.
- [ ] **Step 5: Run tests to verify they pass.** Run: `pnpm --filter @yoyo/api test`. Expected: PASS. Затем `pnpm --filter @yoyo/api dev` и `curl -s localhost:4000/api/v1/health` → `{"status":"ok","db":"up",…}`.
- [ ] **Step 6: Commit.** `git commit -m "feat(api): NestJS app with env validation, Prisma and health endpoint"`.

---

### Task 3: Настройки в БД, OpenAPI и `@yoyo/api-client`

**Files:**
- Create: `apps/api/src/settings/{settings.module,settings.service}.ts`, `apps/api/prisma/seed.ts`, миграция с моделью `Setting`, `apps/api/src/openapi.ts`, `apps/api/scripts/emit-openapi.ts`, `packages/api-client/{package.json,src/index.ts}`. Файл `src/schema.d.ts` генерируется.
- Modify: `apps/api/src/health/health.controller.ts`: схема ответа через `createZodDto(HealthResponseSchema)`. `HealthResponseSchema` добавляется в `@yoyo/shared/src/health.ts`.
- Test: `apps/api/src/settings/settings.service.test.ts` (с настоящей БД), `apps/api/src/openapi.test.ts`.

**Interfaces:**
- Consumes:
  - `SETTING_DEFAULTS` и `SettingKey` из Task 1;
  - `PrismaService` из Task 2.
- Produces:
  - Prisma-модель `Setting { key String @id; value Json; updatedAt DateTime @updatedAt }`.
  - `SettingsService.get<K extends SettingKey>(key: K): Promise<(typeof SETTING_DEFAULTS)[K]>`: если строки нет в базе, возвращает значение по умолчанию.
  - `SettingsService.set<K extends SettingKey>(key: K, value: (typeof SETTING_DEFAULTS)[K]): Promise<void>`.
  - `seed.ts` экспортирует `runSeed(prisma: PrismaClient): Promise<void>`, которая идемпотентно (upsert) записывает все `SETTING_DEFAULTS`. Та же функция вызывается, когда файл запускают как скрипт.
  - `HealthResponseSchema = z.object({ status: z.enum(['ok','degraded']), db: z.enum(['up','down']), version: z.string() })` в `@yoyo/shared`.
  - `buildOpenApiDocument(app: INestApplication): OpenAPIObject`. Скрипт `pnpm --filter @yoyo/api openapi:emit` пишет `apps/api/openapi.json`.
  - Swagger UI на `/api/docs`, кроме production.
  - `createApiClient(baseUrl: string)` из `@yoyo/api-client` возвращает `openapi-fetch` `Client<paths>`. Скрипт `generate` = `openapi-typescript ../../apps/api/openapi.json -o src/schema.d.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
// settings.service.test.ts (yoyo_test, таблица очищается перед каждым тестом)
expect(await settings.get('fees.servicePercent')).toBe(10);          // строки нет → значение по умолчанию
await settings.set('fees.servicePercent', 12);
expect(await settings.get('fees.servicePercent')).toBe(12);
await runSeed(prisma); await runSeed(prisma);
expect(await prisma.setting.count()).toBe(5);                        // сид идемпотентен
// openapi.test.ts
const doc = buildOpenApiDocument(app);
expect(Object.keys(doc.paths)).toContain('/api/v1/health');
expect(Object.keys(doc.paths['/api/v1/health'].get.responses)).toEqual(expect.arrayContaining(['200', '503']));
```

- [ ] **Step 2: Run tests to verify they fail.** Run: `pnpm --filter @yoyo/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** модель и миграцию (`prisma migrate dev --name settings`), `SettingsService`, сид (`prisma db seed`), `buildOpenApiDocument` через nestjs-zod и @nestjs/swagger, генерацию `@yoyo/api-client`.
- [ ] **Step 4: Run tests and generation.** Run: `pnpm --filter @yoyo/api test && pnpm --filter @yoyo/api openapi:emit && pnpm --filter @yoyo/api-client generate && pnpm turbo run typecheck`. Expected: PASS, в `schema.d.ts` есть путь `/api/v1/health`.
- [ ] **Step 5: Commit.** `git commit -m "feat(api): settings store, OpenAPI document and typed api-client"`.

---

### Task 4: Веб: Next.js, три языка, токены `DESIGN.md`, 404

**Files:**
- Create: `apps/web/{package.json,next.config.ts,tsconfig.json,vitest.config.ts,playwright.config.ts,.env.example}`, `messages/{en,lv,ru}.json`, `src/i18n/{routing,request,navigation}.ts`, `src/proxy.ts`, `src/styles/fonts.ts`, `src/styles/tokens.css`, `src/app/globals.css`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/not-found.tsx`, `src/components/ui/{Wordmark,LogoMark,LanguageSwitcher}.tsx`.
- Test: `src/i18n/messages.test.ts`, `e2e/home.spec.ts`.

**Interfaces:**
- Consumes: `LOCALES`, `DEFAULT_LOCALE`, `isLocale` из Task 1.
- Produces:
  - `routing = defineRouting({ locales: LOCALES, defaultLocale: 'en', localePrefix: 'as-needed' })`, навигационные хелперы `Link`, `useRouter`, `usePathname`.
  - `fonts.ts`: `displayFont` (Unbounded 800/900) и `bodyFont` (Onest 500/700) через `next/font/google`, `subsets: ['latin','latin-ext','cyrillic']`, CSS-переменные `--font-display` и `--font-body`.
  - CSS-переменные в `tokens.css`. Значения — из таблицы `DESIGN.md` §2 Project adaptations:
    - цвета: `--canvas`, `--surface`, `--band`, `--mist`, `--ink`, `--cta-bg`, `--cta-fg`, `--marquee-bg`, `--marquee-fg`; палитра наклеек `--sticker-blue|mint|lavender|ember|sun|violet`;
    - движение: `--ease-yoyo`, `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 450ms`;
    - радиусы: `--radius-pill: 9999px`, `--radius-card: 20px`, `--radius-card-xl: 40px`, `--radius-media: 14px`;
    - светлая тема на `:root, [data-theme=light]`, тёмная на `[data-theme=dark]`.
  - `globals.css` маппит переменные в Tailwind `@theme` (`bg-canvas`, `text-ink`, `border-ink`, `font-display`…) и задаёт глобальное правило `prefers-reduced-motion`.
  - Ключи сообщений:
    - `meta.title`, `meta.description`, `home.tagline` (EN: «Rent anything from people nearby.»), `home.lead`;
    - `language.label`, `language.en|lv|ru` (каждый язык подписан на самом себе: «English», «Latviešu», «Русский»);
    - `theme.toggle|light|dark|system`, `notFound.title|body|back`.
  - `<Wordmark />` выводит «YOYO» шрифтом `--font-display` с `aria-label="Yoyo"`. `<LogoMark />` — круглый значок с контуром 1px.

- [ ] **Step 1: Write the failing tests**

```ts
// messages.test.ts (flatKeys и emptyValues — локальные хелперы теста: плоский список ключей и ключи с пустыми строками)
for (const loc of ['lv', 'ru']) expect(flatKeys(messages[loc])).toEqual(flatKeys(messages.en));
for (const loc of LOCALES) expect(emptyValues(messages[loc])).toEqual([]);
// e2e/home.spec.ts
await page.goto('/');    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
await expect(page.getByText(en.home.tagline)).toBeVisible();
await page.goto('/lv');  await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
await page.goto('/ru');  await expect(page.getByText(ru.home.tagline)).toBeVisible();
for (const bad of ['/de', '/LV']) {                                  // Review Focus 2
  const res = await page.goto(bad); expect(res?.status()).toBe(404);
  await expect(page.getByText(en.notFound.back)).toBeVisible();
}
```

- [ ] **Step 2: Run tests to verify they fail.** Run: `pnpm --filter @yoyo/web test && pnpm --filter @yoyo/web e2e`. Expected: FAIL.
- [ ] **Step 3: Implement** файлы из Files и Interfaces.
  - next-intl proxy/middleware отклоняет неизвестный префикс через `notFound()`.
  - Главная временная, но настоящая: значок, «YOYO», `home.tagline`, `home.lead`, переключатель языка.
  - Тексты LV и RU пишет исполнитель, владелец вычитывает.
- [ ] **Step 4: Run tests to verify they pass.** Та же команда. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(web): Next.js app with EN/LV/RU routing, DESIGN.md tokens and 404"`.

---

### Task 5: Темы: системная, светлая, тёмная, без вспышки, круговая смена

**Files:**
- Create: `src/components/theme/theme-script.ts`, `ThemeProvider.tsx`, `ThemeToggle.tsx`, `switch-theme.ts`.
- Modify: `src/app/[locale]/layout.tsx`: читает cookie `yoyo-theme`, ставит `data-theme` на сервере и вставляет `themeInitScript` в `<head>`.
- Test: `src/components/theme/switch-theme.test.ts`, `e2e/theme.spec.ts`.

**Interfaces:**
- Consumes: `THEME_COOKIE`, `parseThemePreference`, `resolveTheme` из Task 1.
- Produces:
  - `themeInitScript: string`. Для `system` выставляет `document.documentElement.dataset.theme` по `matchMedia('(prefers-color-scheme: dark)')` до отрисовки.
  - `useTheme(): { preference: ThemePreference; resolved: ResolvedTheme; setPreference(p: ThemePreference, origin?: { x: number; y: number }): void }`. Пишет cookie на 1 год с `path=/` и `SameSite=Lax`.
  - `shouldAnimateThemeChange(prefersReducedMotion: boolean, supportsViewTransition: boolean): boolean`.
  - `switchTheme(apply: () => void, origin: { x: number; y: number }, animate: boolean): void`. Это круговая волна через View Transitions: `clip-path: circle()` от кнопки до самого дальнего угла, 450 ms, `--ease-yoyo`.
  - `<ThemeToggle />` — IconButton с иконками солнца и луны (поворот при смене), `aria-label` из `theme.toggle`.

- [ ] **Step 1: Write the failing tests**

```ts
// switch-theme.test.ts
expect(shouldAnimateThemeChange(false, true)).toBe(true);
expect(shouldAnimateThemeChange(true, true)).toBe(false);
expect(shouldAnimateThemeChange(false, false)).toBe(false);
// e2e/theme.spec.ts — Review Focus 1 и 5
test.use({ colorScheme: 'dark' });
await page.goto('/', { waitUntil: 'domcontentloaded' });
expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
// сохранённая тема видна уже в HTML от сервера
await context.addCookies([{ name: 'yoyo-theme', value: 'light', url: baseURL }]);
expect(await (await page.request.get('/')).text()).toMatch(/<html[^>]*data-theme="light"/);
// переключение сохраняется после перезагрузки
await page.getByRole('button', { name: en.theme.toggle }).click(); await page.reload();
expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
// reduced motion (отдельный describe): тема сменилась, анимаций нет
test.use({ reducedMotion: 'reduce' });
const toggle = page.getByRole('button', { name: en.theme.toggle });
await toggle.click();
expect(await page.getAttribute('html', 'data-theme')).not.toBeNull();
expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
```

- [ ] **Step 2: Run tests to verify they fail.** Run: `pnpm --filter @yoyo/web test && pnpm --filter @yoyo/web e2e -- theme`. Expected: FAIL.
- [ ] **Step 3: Implement** модули из Interfaces.
- [ ] **Step 4: Run tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(web): system/light/dark themes without flash and circular switch"`.

---

### Task 6: Базовые компоненты: кнопки, чипсы, карточка, поле

**Files:**
- Create: `src/lib/motion.ts`, `src/components/ui/{Button,IconButton,Chip,Card,Field}.tsx`.
- Test: `src/components/ui/{Button,IconButton,Chip,Card,Field}.test.tsx` (Testing Library, jsdom).

**Interfaces:**
- Consumes: токены из Task 4.
- Produces:
  - `motion.ts`: `EASE_YOYO = 'cubic-bezier(.2,.8,.2,1)'`, `DURATION = { fast: 150, base: 250, slow: 450 }` (ms).
  - `<Button variant?: 'primary'|'ghost' size?: 'md'|'lg' href?: string loading?: boolean>`.
    - `primary` залит цветом `--cta-bg`, `ghost` — фон `--surface` с контуром 1px `--ink`.
    - Форма пилюли, минимальная высота 40px.
    - При наведении кнопка приподнимается на 2px, при нажатии `scale(.97)`.
    - С `href` рендерится ссылкой (`Link` из навигации Task 4).
    - `loading` → `aria-busy="true"` и `disabled`.
  - `<IconButton label: string>`: `label` обязателен и уходит в `aria-label`. Размер 40×40, круг с контуром 1px.
  - `<Chip pressed: boolean onPressedChange(next: boolean) color?: StickerColor icon?>`: пилюля-переключатель, `aria-pressed`, при наведении поворот ±4° и подъём.
  - `<Card interactive?: boolean>`: радиус 20px, контур 1px, без тени. С `interactive` наклоняется за курсором до 5° через CSS-переменные `--rx/--ry` и приподнимается на 6px.
  - `<Field label hint? error?>` + `<input>`: подпись связана с полем. Ошибка показывается иконкой и текстом цвета Ember, полю ставятся `aria-invalid` и `aria-describedby`.

- [ ] **Step 1: Write the failing tests**

```tsx
render(<Button loading>Save</Button>);
expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
render(<Button href="/catalog">Browse</Button>);
expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/catalog');
render(<IconButton label="Save item"><svg aria-hidden="true" /></IconButton>);
expect(screen.getByRole('button', { name: 'Save item' })).toBeInTheDocument();
const onChange = vi.fn(); render(<Chip pressed={false} onPressedChange={onChange}>Tools</Chip>);
await user.click(screen.getByRole('button', { name: 'Tools' }));
expect(onChange).toHaveBeenCalledWith(true);
render(<Field label="Email" error="Enter a valid email"><input /></Field>);
const input = screen.getByLabelText('Email');
expect(input).toHaveAttribute('aria-invalid', 'true');
expect(input).toHaveAccessibleDescription('Enter a valid email');
```

- [ ] **Step 2: Run tests to verify they fail.** Run: `pnpm --filter @yoyo/web test -- ui`. Expected: FAIL.
- [ ] **Step 3: Implement** компоненты из Interfaces. Стили — Tailwind-классы на токенах Task 4, без своих цветов.
- [ ] **Step 4: Run tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(web): base UI primitives per DESIGN.md"`.

---

### Task 7: Фирменные элементы: статус, наклейки, бегущая строка

**Files:**
- Create: `src/components/ui/{StatusBadge,Sticker,Marquee}.tsx`.
- Test: `src/components/ui/{StatusBadge,Sticker,Marquee}.test.tsx`, плюс проверка «reduced motion» в `e2e/styleguide.spec.ts` (Task 8).

**Interfaces:**
- Consumes: `StatusTone` и `STATUS_TONE_COLOR` из Task 1.
- Produces:
  - `<StatusBadge tone: StatusTone icon: ReactNode>{label}</StatusBadge>`: пилюля цвета тона, контур 1px, иконка с `aria-hidden` плюс видимый текст, атрибут `data-tone`. У `completed` текст белый, у остальных чёрный.
  - `<Sticker kind: 'coin'|'check'|'bolt'|'star'|'yoyo' label?: string>`: плоская SVG-наклейка с контуром 1px. В покое неподвижна, при наведении покачивается, по клику один раз делает оборот на 360°. В тёмной теме у неё белая кромка. С `label` — `role="img"` и `aria-label={label}`; без `label` — `aria-hidden="true"`.
  - `<Marquee items: string[]>`: полоса `--marquee-bg` / `--marquee-fg`, текст заглавными, 12px, 700, `letter-spacing: .032em`. Содержимое повторено дважды, вторая копия `aria-hidden`. При наведении строка останавливается, при reduced motion не движется вообще.

- [ ] **Step 1: Write the failing tests**

```tsx
render(<StatusBadge tone="dispute" icon={<svg aria-hidden="true" />}>Dispute</StatusBadge>);
expect(screen.getByText('Dispute').closest('[data-tone]')).toHaveAttribute('data-tone', 'dispute');
const { container } = render(<Sticker kind="coin" />);
expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
render(<Sticker kind="check" label="Verified" />);
await user.click(screen.getByRole('img', { name: 'Verified' }));
expect(screen.getByRole('img', { name: 'Verified' })).toHaveAttribute('data-spinning', 'true');
render(<Marquee items={['Rent a PS5', 'Rent a drill']} />);
expect(screen.getAllByText('Rent a PS5')).toHaveLength(2);
expect(screen.getAllByText('Rent a PS5')[1].closest('[aria-hidden="true"]')).not.toBeNull();
```

- [ ] **Step 2: Run tests to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement** компоненты из Interfaces. После `animationend` наклейка сбрасывает `data-spinning`.
- [ ] **Step 4: Run tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(web): StatusBadge, Sticker and Marquee brand components"`.

---

### Task 8: Страница `/styleguide` и связь веба с API

**Files:**
- Create: `src/app/[locale]/styleguide/page.tsx`, `src/lib/api.ts`, `src/lib/use-api-health.ts`.
- Modify: `messages/{en,lv,ru}.json`: ключи `styleguide.*` и `apiStatus.checking|online|offline`.
- Test: `src/lib/use-api-health.test.tsx`, `e2e/styleguide.spec.ts`.

**Interfaces:**
- Consumes:
  - `createApiClient` из Task 3;
  - все компоненты Task 4–7.
- Produces:
  - `api = createApiClient(process.env.NEXT_PUBLIC_API_URL!)` в `src/lib/api.ts`.
  - `useApiHealth(): 'checking'|'online'|'offline'`: `online` только при `200` и `status === 'ok'`, иначе `offline`.
  - `/styleguide` доступна только при `NEXT_PUBLIC_SHOW_STYLEGUIDE=true`, иначе `notFound()`. Страница показывает:
    - палитру и типографику, в том числе образец текста на трёх языках с ā č ē ģ ī ķ ļ ņ š ū ž и кириллицей;
    - все компоненты во всех вариантах;
    - пилюлю статуса API.

- [ ] **Step 1: Write the failing tests**

```ts
// use-api-health.test.tsx (fetch замокан)
mockFetch(200, { status: 'ok', db: 'up', version: '0.1.0' }); expect(await settle()).toBe('online');
mockFetch(503, { status: 'degraded', db: 'down', version: '0.1.0' }); expect(await settle()).toBe('offline');
mockFetchReject(new TypeError('Failed to fetch')); expect(await settle()).toBe('offline');
// e2e/styleguide.spec.ts — для каждой пары theme × locale
for (const theme of ['light', 'dark']) for (const locale of ['', '/lv', '/ru']) {
  // нет ошибок в консоли; AxeBuilder: 0 нарушений уровня serious/critical
  // Review Focus 3: viewport 390×844, document.documentElement.scrollWidth <= innerWidth
}
await expect(page.getByText(en.apiStatus.online)).toBeVisible();     // API запущено в webServer
// Review Focus 5 (reducedMotion: 'reduce'): у Marquee getComputedStyle(track).animationName === 'none'
```

- [ ] **Step 2: Run tests to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `playwright.config.ts` → `webServer`: API (`pnpm --filter @yoyo/api start:prod`, ожидание `http://localhost:4000/api/v1/health`) и веб (`pnpm --filter @yoyo/web start`, порт 3000).
  - `apps/web/.env.example`: `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`, `NEXT_PUBLIC_SHOW_STYLEGUIDE=true`.
- [ ] **Step 4: Run tests to verify they pass.** Run: `pnpm turbo run build && pnpm --filter @yoyo/web e2e`. Expected: PASS.
- [ ] **Step 5: Показать `/styleguide` владельцу** (скриншоты светлой и тёмной темы) и получить «ок». Это проверка того, что токены и компоненты соответствуют `DESIGN.md`.
- [ ] **Step 6: Commit.** `git commit -m "feat(web): styleguide page and live API health via typed client"`.

---

### Task 9: CI в GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`.
- Test: сам прогон workflow.

**Interfaces:**
- Consumes: скрипты `lint`, `typecheck`, `test`, `build`, `e2e` из Task 1–8.
- Produces: обязательная проверка на каждый push и pull request.

- [ ] **Step 1: Implement `ci.yml`.**
  - `ubuntu-latest`, Node из `.nvmrc`, `pnpm/action-setup`, кэш pnpm и `.turbo`.
  - Сервис `postgres:17`: `POSTGRES_DB=yoyo_test`, health-check.
  - Шаги:
    1. `pnpm install --frozen-lockfile`;
    2. `prisma migrate deploy`;
    3. `pnpm turbo run lint typecheck test build`;
    4. `pnpm --filter @yoyo/api openapi:emit && pnpm --filter @yoyo/api-client generate && git diff --exit-code`, чтобы сгенерированный клиент не отставал от API;
    5. `npx playwright install --with-deps chromium && pnpm --filter @yoyo/web e2e`;
    6. загрузка отчёта Playwright как артефакта при падении.
- [ ] **Step 2: Спросить владельца разрешение на push ветки в `origin`**, затем `git push -u origin HEAD`.
- [ ] **Step 3: Verify.** Run: `gh run watch --exit-status`. Expected: workflow `CI` зелёный.
- [ ] **Step 4: Commit** (если правился конфиг): `git commit -m "ci: lint, typecheck, unit, build and e2e on every push"`.

---

### Task 10: Развёртывание в интернете (бесплатно)

**Files:**
- Create: `apps/api/Dockerfile` (multi-stage, официальный образ Node текущей LTS, `prisma migrate deploy` при старте, `node dist/main.js`), `apps/api/.dockerignore`, `scripts/setup-deploy.sh`.
- Modify: `README.md`: раздел «Развёртывание» с адресами и переменными окружения.
- Test: проверки по адресам в интернете.

**Interfaces:**
- Consumes: сборки API и веба.
- Produces:
  - публичный адрес API (`…/api/v1/health`);
  - публичный адрес веба;
  - список переменных окружения: API — `DATABASE_URL`, `WEB_ORIGIN`, `PORT`; веб — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SHOW_STYLEGUIDE=false`.

- [ ] **Step 1: Сгенерировать `scripts/setup-deploy.sh` скиллом `mattpocock-skills:wizard`.** Это пошаговый мастер для того, что делает только владелец:
  - аккаунт и база в Neon (PostgreSQL 17), строка подключения;
  - сервис для API из Docker с поддержкой WebSocket на бесплатном тарифе без карты (Render или аналог) с привязкой к GitHub-репозиторию;
  - проект Vercel с Root Directory `apps/web`;
  - ввод переменных окружения;
  - `vercel login`.
- [ ] **Step 2: Владелец проходит мастер**, исполнитель помогает с ответами.
- [ ] **Step 3: Verify.**
  - `curl -s https://<api>/api/v1/health` → `{"status":"ok","db":"up",…}`.
  - Веб по адресу Vercel показывает «YOYO» на `/`, `/lv`, `/ru`.
  - `/styleguide` в production отдаёт 404.
  - Тёмная тема в системе применяется без вспышки.
- [ ] **Step 4: Записать в README** адреса и пометку, что бесплатный сервер может «засыпать», и перед показом его надо открыть заранее.
- [ ] **Step 5: Commit.** `git commit -m "chore(deploy): Dockerfile, deploy wizard and live URLs"`.

---

## Self-Review (выполнено при написании)

- **Покрытие спецификации плана 1.**
  - §3: бюджет, подмена шрифтов, домена, почты и хостинга (Global Constraints, Task 4, Task 10); три языка (Task 4, 8); шрифты с кириллицей (Task 4, 8).
  - §5: стек, OpenAPI и клиент (Task 2, 3), CI (Task 9), хостинг (Task 10).
  - §8: токены и базовые компоненты (Task 4–7).
  - §4.9: темы и reduced motion (Task 5, 7, 8), 404 (Task 4), доступность (Task 8).
  - Остальные разделы спецификации — в планах 2–12 по дорожной карте.
- **Согласованность имён.** `SETTING_DEFAULTS`, `StatusTone`, `resolveTheme`, `createApiClient` и `useApiHealth` везде называются одинаково. Ключи сообщений, которые используют тесты, определены в Task 4 и Task 8.
- **Review Focus.** У всех пяти пунктов есть тест в своей задаче (Task 2, 4, 5, 7/8).
