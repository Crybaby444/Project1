# Yoyo — План 5: Аккаунты, экраны. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Человек на сайте может:
- зарегистрироваться и подтвердить почту по письму;
- войти по паролю или через Google;
- восстановить пароль;
- изменить профиль, язык и тему;
- сменить пароль, выйти со всех устройств и удалить аккаунт.

В шапке видно, вошёл ли он. Всё по `DESIGN.md`, на EN/LV/RU, в светлой и тёмной теме.

**Architecture:**
- **Сессия в браузере.** Сайт обращается к API только через свой домен (`/api/v1/...`, прокси из плана 3), поэтому cookie первой стороны работают везде.
- **Обновление токена.** Обёртка над API-клиентом при `401` один раз и для всех вкладок сразу обновляет сессию (`navigator.locks` с запасным модульным promise), затем повторяет запрос.
- **Хранилище сессии.** `SessionProvider` (TanStack Query) держит пользователя.
- **Закрытые страницы** проверяют сессию на клиенте (`RequireSession`). Cookie `yoyo_rt` ходит только на `/api/v1/auth`, поэтому сервер не может обновить сессию при рендере, и делать редирект на сервере нельзя.
- **Формы:** react-hook-form и zod-схемы из `@yoyo/shared`, сообщения через next-intl.

**Tech Stack:**
- уже есть: Next.js 16, next-intl 4, Tailwind 4, `@yoyo/api-client`;
- новое: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`;
- тесты: Vitest и Testing Library, Playwright с axe, письма проверяются через Mailpit.

Версии берутся последние стабильные, проходящие политику pnpm о возрасте релиза.

**Spec:** [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md):
- §0 (приоритет);
- §4.2 (аккаунт);
- §4.9 (сквозное: состояния, темы, доступность);
- §7 (маршруты `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/settings/*`);
- §8 (микровзаимодействия).

API — [план 3](./2026-11-03-yoyo-03-accounts-api.md) после ревью (PR #1).

## Global Constraints

**Общие правила**
- Действуют правила планов 1 и 3: TypeScript strict, три языка с одинаковым набором ключей, `DESIGN.md`, политика pnpm, бюджет ноль.
- **Рабочие экраны спокойнее главной** (`DESIGN.md` §7): холст `canvas`, карточка `surface` с контуром 1px, радиус `card-xl`, дисплейный шрифт только в заголовке экрана. Громкие наклейки и бегущая строка здесь запрещены, одна маленькая наклейка-акцент допускается.
- **Тексты.** Никакой рыбы и мёртвых ссылок. Ссылки на «Условия» и «Конфиденциальность» появятся в плане 12, здесь их нет.

**Доступность**
- Каждое поле с `<label>`, ошибка связана через `aria-describedby` и `aria-invalid`.
- После неудачной отправки фокус переходит на первое поле с ошибкой.
- Кнопка во время запроса `aria-busy` и выключена от двойного нажатия.
- Контраст AA в обеих темах, видимый фокус, работа с клавиатуры.

**Ошибки API**
- Ответ `{ error: { code, message, fields? } }` превращается в `ApiError` (`code`, `status`, `fields`, `retryAfterSeconds`).
- Текст для человека берётся из `errors.<CODE>` в сообщениях.
- Ошибки полей: сначала их ловит та же zod-схема на клиенте, а `fields` с сервера показываются у соответствующих полей общим текстом `errors.fieldInvalid`.

**Лимит запросов**
- На `429` показывается «Слишком много попыток, попробуйте через N с».
- N берётся из `Retry-After` и тикает обратным отсчётом, кнопка до нуля выключена.

**Переходы и сессия**
- **`next`.** Безопасный переход после входа: `?next=` принимается только как относительный путь, начинающийся с `/` и не с `//`, иначе `/`. Используется на `/login`, `/register` и в Google `returnTo`.
- **Обновление токена** выполняется не чаще одного раза одновременно: на 10 параллельных `401` уходит ровно один `POST /api/v1/auth/refresh`.
- **Повтор после обновления.** Если после обновления тот же запрос снова получил `401`, сессия считается закрытой и цикла нет.

**Тема**
- В настройках три варианта: системная, светлая, тёмная (закрывает отложенное «нет пути обратно к системной теме» из плана 1).
- Выбор пишется в cookie `yoyo-theme` и, если человек вошёл, в профиль (`PATCH /me { theme }`).

## Review Focus

1. **Шторм обновлений.** Несколько вкладок или запросов одновременно получают `401`. Ожидание: один refresh, остальные ждут его и повторяют запрос. Если refresh не удался, все переходят в «не вошёл» без бесконечного цикла. Тест в Task 1.
2. **Открытый редирект через `next`.** `?next=https://evil.example`, `?next=//evil.example`, `?next=/\evil.example`. Ожидание: переход на `/`. Тест в Task 4.
3. **Перечисление пользователей.** «Забыли пароль» для существующего и несуществующего email показывает один и тот же экран, а неверный пароль и неизвестный email дают один и тот же текст. Тест в Task 5.
4. **Аккаунт только с Google** (нет пароля). Ожидание: смены пароля нет, вместо неё объяснение «вы входите через Google»; удаление не спрашивает пароль. Тест в Task 6.
5. **Ссылка из письма открыта повторно или истекла.** Ожидание: понятный экран «ссылка использована» или «ссылка устарела» с действием «прислать новую», если человек вошёл, а не голая ошибка. Тест в Task 5.

---

## Структура файлов (итог плана)

```
apps/web/src/lib/session/{api-error.ts,fetch-with-refresh.ts,SessionProvider.tsx,RequireSession.tsx,safe-next.ts} (+ tests)
apps/web/src/lib/forms/{use-api-form.ts,zod-messages.ts} (+ tests)
apps/web/src/components/layout/{SiteHeader.tsx,UserMenu.tsx,VerifyEmailBanner.tsx} (+ tests)
apps/web/src/components/auth/{AuthCard.tsx,PasswordField.tsx,GoogleButton.tsx,RetryAfterNotice.tsx,FormError.tsx} (+ tests)
apps/web/src/components/theme/ThemeSelect.tsx (+ test)
apps/web/src/app/[locale]/(auth)/{login,register,verify-email,forgot-password,reset-password}/page.tsx
apps/web/src/app/[locale]/settings/{layout.tsx,page.tsx,security/page.tsx}
apps/web/messages/{en,lv,ru}.json        (новые разделы: auth, settings, errors, header)
apps/api: PublicUser.hasPassword; ошибки Google → редирект на /login?oauthError=CODE
apps/web/e2e/{auth.spec.ts,settings.spec.ts,support/mailpit.ts}
```

---

### Task 1: Сессия: ошибки API, обновление токена, провайдер

**Files:**
- Create: `apps/web/src/lib/session/{api-error.ts,fetch-with-refresh.ts,SessionProvider.tsx,RequireSession.tsx,safe-next.ts}`.
- Modify: `apps/web/src/app/[locale]/layout.tsx` (оборачивает в `QueryClientProvider` и `SessionProvider`), `apps/web/package.json`.
- Test: те же пути с `.test.ts(x)`.

**Interfaces:**
- Produces:
  - `class ApiError extends Error { code: ErrorCode | 'NETWORK'; status: number; fields?: Record<string,string>; retryAfterSeconds?: number }`.
  - `toApiError(response: Response, body: unknown): ApiError`.
  - `fetchWithRefresh(input: RequestInfo, init?: RequestInit): Promise<Response>`. Её передают в `createApiClient(baseUrl, { fetch })`. Поведение:
    - на `401` с кодом `AUTH_UNAUTHENTICATED` или `TOKEN_EXPIRED` один раз вызывает общий `refreshOnce()`, затем повторяет исходный запрос;
    - сами вызовы `/api/v1/auth/*` не обновляет.
  - `refreshOnce(): Promise<boolean>`: одна активная попытка на всё приложение. Если есть `navigator.locks.request('yoyo-refresh', …)`, используется он, иначе модульный promise.
  - `useSession(): { status: 'loading' | 'authenticated' | 'anonymous'; user: PublicUser | null; refresh(): Promise<void>; signOut(): Promise<void> }`. Пользователь берётся из `GET /api/v1/me`.
  - `<RequireSession>{children}</RequireSession>`: пока `loading`, показывает скелетон; при `anonymous` делает `router.replace('/login?next=' + текущий путь)`.
  - `safeNext(value: string | null | undefined): string`.

- [ ] **Step 1: Write the failing tests**

```ts
// fetch-with-refresh.test.ts (fetch подменён тестовой функцией)
await Promise.all(Array.from({ length: 10 }, () => fetchWithRefresh('/api/v1/me')));   // все 10 получили 401, затем 200
expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1);           // Review Focus 1
// refresh вернул 401 → исходные запросы получают 401, refresh вызван один раз, повторных циклов нет
// /api/v1/auth/login с 401 → refresh не вызывается
// api-error.test.ts: { error: { code: 'RATE_LIMITED' } } + Retry-After: 42 → ApiError { code: 'RATE_LIMITED', retryAfterSeconds: 42 }
// safe-next.test.ts
expect(safeNext('/settings')).toBe('/settings');
for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '']) expect(safeNext(bad)).toBe('/');
// RequireSession.test.tsx: anonymous → router.replace('/login?next=%2Fsettings'); loading → скелетон с aria-busy
```

- [ ] **Step 2: Run, verify FAIL.** `pnpm --filter @yoyo/web test`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `feat(web): session provider with single-flight token refresh`.

---

### Task 2: API: пароль у аккаунта и ошибки Google в интерфейс

**Files:**
- Modify: `packages/shared/src/auth.ts` (`PublicUserSchema.hasPassword: boolean`), the API's PublicUser mapper, `apps/api/src/auth/auth.controller.ts` (Google callback).
- Regenerate: `apps/api/openapi.json`, `packages/api-client/src/schema.d.ts`.
- Test: API e2e (`auth.google.e2e.test.ts`, `me.e2e.test.ts`).

**Interfaces:**
- Produces:
  - `PublicUser.hasPassword`: `true`, если у аккаунта есть `passwordHash`.
  - Неудачный callback Google (отмена, неверный state, ошибка Google, блокировка) отвечает `302` на `${WEB_ORIGIN}${localePrefix}/login?oauthError=<CODE>`, а не JSON. `CODE` — один из `OAUTH_CANCELLED`, `OAUTH_STATE_INVALID`, `OAUTH_FAILED`, `AUTH_BLOCKED`. Новые коды добавляются в `ERROR_CODES`.
- Сайт показывает текст `errors.<CODE>` над формой входа.

- [ ] **Step 1: Write the failing tests:**
  - аккаунт, созданный через Google, → `hasPassword: false`;
  - аккаунт с паролем → `true`;
  - callback с неверным state → `302` на `/login?oauthError=OAUTH_STATE_INVALID`, без JSON-тела.
- [ ] **Step 2–4:** RED → реализация → GREEN; проверка расхождения клиента зелёная.
- [ ] **Step 5: Commit.** `feat(api): expose hasPassword and send Google sign-in errors back to the login page`.

---

### Task 3: Шапка, меню пользователя, баннер подтверждения, выбор темы

**Files:**
- Create: `apps/web/src/components/layout/{SiteHeader.tsx,UserMenu.tsx,VerifyEmailBanner.tsx}`, `apps/web/src/components/theme/ThemeSelect.tsx`.
- Modify: `apps/web/src/app/[locale]/layout.tsx`: шапка вместо отдельной кнопки темы в углу.
- Test: рядом с компонентами.

**Interfaces:**
- **`SiteHeader`:**
  - слева `Wordmark` — ссылка на главную;
  - справа: `LanguageSwitcher`, `ThemeToggle`, затем «Войти» и «Регистрация» для гостя или `UserMenu` для вошедшего;
  - на телефоне (390px) всё помещается в одну строку: меню языка сворачивается в кнопку.
- **`UserMenu`:** кнопка-аватар (инициалы на кружке-наклейке, цвет детерминирован по `user.id` из `STICKER_COLORS`), раскрывает меню по шаблону WAI-ARIA menu button. Пункты: имя и email, «Настройки», «Выйти».
- **`VerifyEmailBanner`:** для `emailVerified === false` — тонкая полоса под шапкой «Подтвердите почту» и кнопка «Отправить письмо ещё раз» (`POST /auth/resend-verification`). Ответ `202` показывает тост «Письмо отправлено»; `429` — обратный отсчёт.
- **`ThemeSelect`:** радиогруппа «Системная / Светлая / Тёмная»; пишет cookie, и для вошедшего — профиль.

- [ ] **Step 1: Write the failing tests:**
  - гость видит «Войти» и «Регистрация»;
  - вошедший видит инициалы и открывает меню клавишами Enter и Esc, фокус возвращается на кнопку;
  - баннер есть только при `emailVerified: false`, повторная отправка с `429` выключает кнопку на N секунд;
  - `ThemeSelect` со «Системная» удаляет явный выбор.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): site header with user menu, email confirmation banner and theme choice`.

---

### Task 4: Вход и регистрация

**Files:**
- Create: `apps/web/src/app/[locale]/(auth)/{login,register}/page.tsx`, `apps/web/src/components/auth/{AuthCard.tsx,PasswordField.tsx,GoogleButton.tsx,RetryAfterNotice.tsx,FormError.tsx}`, `apps/web/src/lib/forms/{use-api-form.ts,zod-messages.ts}`.
- Test: компоненты (unit), `apps/web/e2e/auth.spec.ts` (часть).

**Interfaces:**
- **`/login`:**
  - поля email и пароль; ссылки «Забыли пароль?» и «Нет аккаунта? Регистрация»;
  - кнопка Google, если `GET /auth/providers` вернул `google: true` (ссылка `/api/v1/auth/google?returnTo=<safeNext(next)>`);
  - сообщения `oauthError` из Task 2;
  - после входа `router.replace(safeNext(next))` и обновление сессии.
- **`/register`:**
  - поля имя, email, пароль; язык — текущий язык страницы;
  - подсказка силы пароля (три уровня по длине и разнообразию, без внешних библиотек);
  - после успеха переход на `safeNext(next)`, сверху появляется баннер подтверждения.
- **`PasswordField`:** кнопка «показать/скрыть» с `aria-pressed`.
- **`use-api-form`:** связывает react-hook-form с zod-схемой из `@yoyo/shared` и превращает `ApiError` в ошибки полей и формы.
- **Тексты zod на трёх языках:** `zod-messages.ts` переводит коды ошибок zod (`too_small`, `invalid_format` и т. п.) через next-intl.
- **Если вход уже выполнен:** `/login` и `/register` сразу ведут на `safeNext(next)`.

- [ ] **Step 1: Write the failing tests**

```ts
// login.test.tsx: пустая отправка → ошибки у обоих полей и фокус на email; 401 AUTH_INVALID_CREDENTIALS → errors.AUTH_INVALID_CREDENTIALS над формой
// 429 + Retry-After: 30 → «попробуйте через 30 с», кнопка disabled, через 30 тиков снова активна (фальшивые таймеры)
// GoogleButton скрыт при providers.google = false
// e2e (Review Focus 2): /login?next=//evil.example → после входа URL = '/'
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): sign-in and sign-up pages with Google, rate-limit countdown and safe redirects`.

---

### Task 5: Подтверждение почты, «Забыли пароль», новый пароль

**Files:**
- Create: `apps/web/src/app/[locale]/(auth)/{verify-email,forgot-password,reset-password}/page.tsx`, `apps/web/e2e/support/mailpit.ts`.
- Test: unit для страниц и `apps/web/e2e/auth.spec.ts`.

**Interfaces:**
- **`/verify-email?token=`:** при открытии один раз отправляет `POST /auth/verify-email`. Состояния:
  - «Проверяем…» (скелетон);
  - «Почта подтверждена» и кнопка «Продолжить»;
  - `TOKEN_USED` или `TOKEN_EXPIRED`: понятный текст и «Отправить новое письмо», если человек вошёл, иначе «Войти»;
  - нет `token` → такой же экран, как для недействительной ссылки.
- **`/forgot-password`:** поле email. После отправки — всегда один и тот же экран «Если такой аккаунт есть, мы отправили письмо», кроме `429`.
- **`/reset-password?token=`:** новый пароль дважды (совпадение проверяется на клиенте). Успех → «Пароль изменён», вход и переход на главную, как велит API (R23). Ошибки токена — как в verify-email.
- **`mailpit.ts` (только для e2e):** `latestTo(email): Promise<{ subject; text; html }>` и `linkFrom(message, pathPart)` через HTTP API Mailpit `http://localhost:8025/api/v1`.

- [ ] **Step 1: Write the failing tests**

```ts
// e2e: регистрация → письмо в Mailpit → открыть ссылку → «Почта подтверждена» → баннер исчез
// e2e: та же ссылка второй раз → экран «ссылка уже использована» (Review Focus 5)
// e2e: forgot-password для известного и неизвестного email → одинаковый текст на экране (Review Focus 3)
// e2e: forgot-password → письмо → reset-password → вход новым паролем; старый пароль → errors.AUTH_INVALID_CREDENTIALS
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): email confirmation and password reset pages`.

---

### Task 6: Настройки: профиль, безопасность, удаление аккаунта

**Files:**
- Create: `apps/web/src/app/[locale]/settings/{layout.tsx,page.tsx,security/page.tsx}`.
- Test: unit и `apps/web/e2e/settings.spec.ts`.

**Interfaces:**
- **Раскладка:** `settings/layout.tsx` — `RequireSession` и вкладки «Профиль / Безопасность» (на телефоне сегментированный переключатель).
- **«Профиль»** (`PATCH /me`):
  - поля имя, город, «о себе» (счётчик символов, 500), язык писем и интерфейса, тема (`ThemeSelect`);
  - смена языка сохраняет профиль и переключает адрес страницы на выбранный язык;
  - успех показывает тост, ошибки отображаются у полей.
- **«Безопасность»:**
  - **Смена пароля** (`POST /me/password`): текущий пароль, новый и повтор. Для `hasPassword: false` вместо формы текст «Вы входите через Google» (Review Focus 4).
  - **«Выйти на всех устройствах»** (`POST /auth/logout-all`) с подтверждением в диалоге.
  - **«Удалить аккаунт»** (`DELETE /me`): диалог с предупреждением и вводом слова-подтверждения (на языке интерфейса). Пароль спрашивается только при `hasPassword`. После удаления — выход и главная с тостом.
- Подтверждение телефона не показывается, пока `GET /auth/providers` даёт `phone: false` (спецификация §0).
- **Диалоги:** нативный `<dialog>` с ловушкой фокуса и закрытием по Esc.

- [ ] **Step 1: Write the failing tests**

```ts
// e2e: смена имени → новое имя в меню пользователя; смена языка на LV → адрес /lv/settings, интерфейс на латышском
// e2e: смена пароля → старый пароль больше не входит; logout-all → в соседнем контексте браузера запрос /me даёт 401 сразу
// e2e: удаление → выход, вход тем же email и паролем → errors.AUTH_INVALID_CREDENTIALS
// unit: hasPassword=false → формы смены пароля нет, диалог удаления без поля пароля (Review Focus 4)
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): profile and security settings with account deletion`.

---

### Task 7: Переводы, доступность, документация

**Files:**
- Modify: `apps/web/messages/{en,lv,ru}.json` (вычитать), `README.md` (раздел «Аккаунты»: страницы и сценарии), `apps/web/e2e/*.spec.ts` (axe).
- Test: тест равенства ключей (есть с плана 1), axe на новых страницах.

- [ ] **Step 1: Write the failing tests:** axe без нарушений уровня serious и critical на `/login`, `/register`, `/forgot-password`, `/settings` и `/settings/security`, в светлой и тёмной теме и на ширине 390px.
- [ ] **Step 2–4:** RED → правки → GREEN. Полный прогон `pnpm turbo run lint typecheck test build` и `pnpm --filter @yoyo/web e2e`.
- [ ] **Step 5: Commit.** `chore(web): accounts screens pass axe in both themes and on phones; docs`.

---

## Self-Review (выполнено при написании)

- **Покрытие спецификации:**
  - §4.2 (регистрация, вход, Google, подтверждение почты, восстановление пароля, выход со всех устройств, настройки: имя, город, «о себе», язык, тема, смена пароля, удаление): Task 3–6;
  - §4.9 (состояния, темы, доступность, телефон): Task 3–7;
  - §7 (маршруты): Task 4–6.
  - Аватар (загрузка и обрезка) — план 6, когда появится хранилище фото. Уведомления по типам — план 9. Подтверждение телефона — когда будет SMS-провайдер (§0).
- **Связь с отложенным из ревью плана 3:** однократное обновление токена (Minor 3) — Task 1; понятные ошибки Google (R25) — Task 2.
- **Согласованность имён:** `ApiError`, `fetchWithRefresh`, `refreshOnce`, `useSession`, `RequireSession`, `safeNext`, `PublicUser.hasPassword` одинаковы во всех задачах.
