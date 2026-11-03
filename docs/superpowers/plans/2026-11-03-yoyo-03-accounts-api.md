# Yoyo — План 3: Аккаунты (API). План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Серверная часть аккаунтов Yoyo. В неё входят:
- регистрация и подтверждение почты;
- вход, обновление сессии, выход, выход со всех устройств;
- сброс пароля;
- вход через Google;
- профиль, смена пароля, удаление аккаунта;
- имитация подтверждения телефона;
- роли (пользователь и администратор);
- письма на трёх языках;
- связка сайта с API через один домен.

Страницы входа и регистрации здесь не делаются: они появятся в UI-плане после утверждения дизайна (план 2).

**Architecture:** Модуль `auth` в NestJS.
- **Пароли:** argon2id.
- **Access-токен:** JWT HS256 через `jose`, живёт 15 минут.
- **Refresh-токен:** случайный, в базе хранится только его SHA-256 хэш. Ротация «семьями»: повторное использование старого токена отзывает всю семью.
- **Веб:** получает оба токена в httpOnly-cookie на **своём** домене. Next.js проксирует `/api/*` на API, так cookie остаются первой стороной даже на бесплатных адресах `vercel.app` и `onrender.com`.
- **Мобильные клиенты (позже):** `Authorization: Bearer` и refresh-токен в теле запроса.
- **Письма:** провайдер за интерфейсом. Локально Mailpit, в production SMTP (Gmail).

**Tech Stack:**
- уже есть: NestJS 11, Prisma 7, PostgreSQL 17, zod 4, nestjs-zod;
- новое: `@node-rs/argon2`, `jose`, `cookie-parser`, `helmet`, `@nestjs/throttler`, `nodemailer`, React Email (`@react-email/components`, `@react-email/render`);
- тесты: Vitest и supertest, Playwright для одного сквозного сценария через прокси.

Версии берутся последние стабильные, прошедшие политику pnpm о минимальном возрасте релиза (без исключений `minimumReleaseAgeExclude`).

**Spec:**
- [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md): §4.2 Аккаунт, §4.7 письма аккаунта, §5 «Вход», §5 «Безопасность»;
- база: [план 1](./2026-11-03-yoyo-01-foundation.md);
- [дорожная карта](./2026-11-03-yoyo-roadmap.md).

## Global Constraints

**Общее**
- Действуют все Global Constraints плана 1: TypeScript strict, имена пакетов, `/api/v1`, три языка, `DESIGN.md`, бюджет ноль, перед установкой программ на машину спросить владельца.

**Секреты и переменные окружения**
- Секреты берутся только из env:
  - `JWT_SECRET` — не короче 32 символов, обязателен;
  - `SMTP_URL` — в development и test по умолчанию `smtp://localhost:1025` (Mailpit). В production необязателен: без него используется `DisabledMailProvider`, который пишет в лог «mail disabled», имя шаблона и замаскированный адрес, но никогда ссылку или код;
  - `TRUST_PROXY_HOPS` — целое ≥ 0, по умолчанию 0. Если больше 0, вызывается `app.set('trust proxy', hops)`, чтобы `req.ip` был адресом клиента. На Render значение 2 (балансировщик Render и прокси Vercel), задаётся в `render.yaml`;
  - `MAIL_FROM` — по умолчанию `Yoyo <no-reply@yoyo.local>`;
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — опциональны;
  - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — опциональны, нужны для сида.
- Все переменные описаны в `EnvSchema` (`apps/api/src/config/env.ts`) с тестами и в `.env.example`.

**Пароли и почта**
- Пароль от 8 до 128 символов, хэш argon2id.
- Email обрезается по краям и приводится к нижнему регистру **до** любой проверки и записи.

**Токены и cookie**
- Access JWT живёт 15 минут, claims `{ sub, role }`.
- Refresh-токен: 32 байта `crypto.randomBytes`, base64url, живёт 30 дней. В БД только `sha256` хэш.
- Cookie на веб-домене, HttpOnly, SameSite=Lax, Secure при `NODE_ENV=production`:
  - `yoyo_at`: Max-Age 900, Path `/`;
  - `yoyo_rt`: Max-Age 2592000, Path `/api/v1/auth`.

**Защита**
- `helmet()`.
- Небезопасные методы (POST/PUT/PATCH/DELETE): если заголовок `Origin` есть и не равен `WEB_ORIGIN`, ответ 403 `ORIGIN_FORBIDDEN`. Запросы без Origin (мобильные, server-to-server) пропускаются.
- Ограничение частоты:
  - `login`: 5 запросов в минуту на IP+email **и** 20 в час на email с любых IP (подделка IP при прямом обращении к Render не помогает перебирать пароль);
  - `register`: 10 в минуту на IP;
  - `forgot-password`: 3 в час на IP+email и 5 в час на email;
  - повторная отправка кода телефона: 1 в минуту на пользователя.
- Превышение лимита: 429 `RATE_LIMITED` и заголовок `Retry-After`.

**Формат ошибок**
- Все ошибки отдаются как `{ "error": { "code": ErrorCode, "message": string, "fields"?: Record<string,string> } }`.
- `ERROR_CODES` лежат в `@yoyo/shared` и используются и на сайте, и в API.

**Утечки**
- Никакого перечисления пользователей: `forgot-password` и `resend-verification` всегда отвечают 202. Вход с неизвестным email и с неверным паролем возвращает одинаковые 401 и тело.
- Неудачная отправка письма не ломает регистрацию и сброс пароля: ошибка пишется в лог, пользователь может отправить письмо повторно.

**Время**
- Время берётся только через инжектируемый `Clock` (токен `CLOCK`), чтобы тесты могли «перематывать» его.

## Review Focus

1. **Украденный refresh-токен использован после ротации.** Ожидание: отзывается вся семья, и вор, и владелец разлогинены. Тест в Task 3 и Task 6.
2. **Регистрация на уже занятый email в другом регистре** (`User@Mail.com` при существующем `user@mail.com`). Ожидание: 409 `AUTH_EMAIL_TAKEN`, дубликата нет. Тест в Task 5.
3. **Заблокированный пользователь с ещё живым access-токеном.** Ожидание: защищённые маршруты отвечают 403 `AUTH_BLOCKED` сразу, а не через 15 минут. Тест в Task 6.
4. **Ссылка из письма открыта повторно или после истечения срока.** Ожидание: 410 `TOKEN_USED` или `TOKEN_EXPIRED`, повторно использовать её нельзя. Тесты в Task 5 и Task 7.
5. **Перебор.** Ожидание: шестая попытка входа за минуту даёт 429 с `Retry-After`; после пяти неверных кодов телефона код аннулируется (410). Тесты в Task 6 и Task 9.

---

## Структура файлов (итог плана)

```
packages/shared/src/errors.ts                      ERROR_CODES, type ErrorCode, ApiErrorBody
packages/shared/src/auth.ts                        zod-схемы запросов/ответов auth и профиля
apps/api/src/common/{app-error.ts,error.filter.ts,origin.guard.ts} (+ tests)
apps/api/src/clock/clock.ts                        Clock, CLOCK, SystemClock
apps/api/src/auth/{auth.module,auth.controller,auth.service,password.service,access-token.service,
                   refresh-token.service,auth.guard,roles.guard,current-user.decorator,cookies,google-oauth.service}.ts
apps/api/src/me/{me.module,me.controller,me.service,phone.service}.ts
apps/api/src/mail/{mail.module,mail.provider,smtp-mail.provider,mail.service}.ts
apps/api/src/mail/templates/{Layout,VerifyEmail,ResetPassword,PhoneCode}.tsx + i18n/{en,lv,ru}.json
apps/api/src/sms/{sms.provider,mailbox-sms.provider}.ts
apps/api/src/admin/{admin.module,admin.controller}.ts
apps/api/prisma/schema.prisma (+ migration accounts) · prisma/seed.ts (admin)
apps/api/test/support/{test-app.ts,mailbox.ts,fake-google.ts}
apps/web/next.config.ts (rewrites) · apps/web/src/lib/{api-url,api}.ts · apps/web/e2e/auth-proxy.spec.ts
.github/workflows/ci.yml (mailpit + JWT_SECRET) · render.yaml (новые env) · README.md (раздел «Аккаунты»)
```

---

### Task 1: Платформа API: единые ошибки, валидация, защита

**Files:**
- Create: `packages/shared/src/errors.ts`, `apps/api/src/common/app-error.ts`, `apps/api/src/common/error.filter.ts`, `apps/api/src/common/origin.guard.ts`.
- Modify: `apps/api/src/app.setup.ts` (helmet, cookie-parser, глобальный `ZodValidationPipe`, фильтр), `apps/api/src/app.module.ts` (`ThrottlerModule`, `APP_GUARD` для `OriginGuard`).
- Test: `apps/api/test/platform.e2e.test.ts`, `packages/shared/src/errors.test.ts`.

**Interfaces:**
- Produces:
  - `ERROR_CODES` (`as const`): `VALIDATION_FAILED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_TAKEN`, `AUTH_UNAUTHENTICATED`, `AUTH_FORBIDDEN`, `AUTH_BLOCKED`, `AUTH_PROVIDER_DISABLED`, `TOKEN_EXPIRED`, `TOKEN_USED`, `RATE_LIMITED`, `ORIGIN_FORBIDDEN`, `NOT_FOUND`, `INTERNAL`;
  - `type ErrorCode`, `type ApiErrorBody = { error: { code: ErrorCode; message: string; fields?: Record<string, string> } }`;
  - `class AppError extends Error { constructor(code: ErrorCode, status: number, message?: string, fields?: Record<string,string>) }`.
  - `ErrorFilter` превращает `AppError`, `ZodValidationException`, `ThrottlerException` (429 и `Retry-After`), `NotFoundException` и любые другие ошибки в `ApiErrorBody`. На 500 отдаётся `INTERNAL` без стека и текста исходной ошибки, полная ошибка пишется в лог.

- [ ] **Step 1: Write the failing tests**

```ts
// platform.e2e.test.ts (поднимает AppModule как в Task 2 плана 1)
// тестовый контроллер, который бросает Error, регистрируется только в тесте
expect((await request(server).post('/api/v1/__test/echo').send({ email: 'nope' })).body)
  .toEqual({ error: { code: 'VALIDATION_FAILED', message: expect.any(String), fields: { email: expect.any(String) } } });
expect((await request(server).post('/api/v1/__test/echo').set('Origin', 'https://evil.example').send(valid)).status).toBe(403);
expect((await request(server).post('/api/v1/__test/echo').send(valid)).status).toBe(200);           // без Origin — можно
expect((await request(server).get('/api/v1/nope')).body.error.code).toBe('NOT_FOUND');
const boom = await request(server).get('/api/v1/__test/boom');
expect(boom.status).toBe(500); expect(boom.body).toEqual({ error: { code: 'INTERNAL', message: expect.any(String) } });
expect(JSON.stringify(boom.body)).not.toContain('secret-detail');                                    // текст исходной ошибки не утекает
expect((await request(server).get('/api/v1/health')).headers['x-content-type-options']).toBe('nosniff');
// TRUST_PROXY_HOPS: тестовый маршрут __test/ip отдаёт req.ip
expect((await request(appWithHops(1)).get('/api/v1/__test/ip').set('X-Forwarded-For', '203.0.113.7')).body.ip).toBe('203.0.113.7');
expect((await request(appWithHops(0)).get('/api/v1/__test/ip').set('X-Forwarded-For', '203.0.113.7')).body.ip).not.toBe('203.0.113.7');
```

- [ ] **Step 2: Run tests, verify they fail.** `pnpm --filter @yoyo/api test`. Expected: FAIL.
- [ ] **Step 3: Implement** модули из Interfaces. Тестовые маршруты `__test/*` регистрируются только тестовым модулем, а не в `AppModule`.
- [ ] **Step 4: Run tests, verify they pass.** Expected: PASS. Плюс `pnpm turbo run lint typecheck test`.
- [ ] **Step 5: Commit.** `feat(api): uniform error format, validation, helmet and origin guard`.

---

### Task 2: Модели аккаунтов и миграция

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, миграция `accounts`.
- Test: `apps/api/test/accounts-schema.test.ts`.

**Interfaces:**
- Produces:
  - `enum Role { USER ADMIN }`, `enum EmailTokenType { VERIFY_EMAIL RESET_PASSWORD }`.
  - `model User`:
    - `id String @id @default(cuid())`, `email String @unique` (всегда lowercase), `passwordHash String?`;
    - `name String`, `city String?`, `about String?`;
    - `locale String @default("en")`, `role Role @default(USER)`;
    - `emailVerifiedAt DateTime?`, `phone String?`, `phoneVerifiedAt DateTime?`;
    - `blockedAt DateTime?`, `blockedReason String?`, `deletedAt DateTime?`;
    - `createdAt`, `updatedAt`.
  - `model RefreshToken { id, userId, familyId String, tokenHash String @unique, expiresAt, revokedAt?, replacedById?, userAgent?, ip?, createdAt }` с индексами `(userId)` и `(familyId)`.
  - `model EmailToken { id, userId, type EmailTokenType, tokenHash @unique, expiresAt, usedAt?, createdAt }`.
  - `model OAuthAccount { id, userId, provider String, providerAccountId String, createdAt, @@unique([provider, providerAccountId]) }`.
  - `model PhoneCode { id, userId, phone String, codeHash String, expiresAt, attempts Int @default(0), consumedAt?, createdAt }`.
  - Все связи — `onDelete: Cascade` от `User`.

- [ ] **Step 1: Write the failing tests:** создание пользователя; второй с тем же email → `P2002`; удаление пользователя каскадно удаляет его `RefreshToken`.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** схему и `pnpm --filter @yoyo/api db:migrate --name accounts`.
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `feat(api): account models (users, sessions, email tokens, oauth, phone codes)`.

---

### Task 3: Часы, пароли и токены

**Files:**
- Create: `apps/api/src/clock/clock.ts`, `apps/api/src/auth/{password.service,access-token.service,refresh-token.service}.ts`.
- Test: тот же путь с `.test.ts`. Refresh-тесты идут на настоящей БД.

**Interfaces:**
- Produces:
  - `interface Clock { now(): Date }`, токен `CLOCK`, `SystemClock`; в тестах `FakeClock` с `advance(ms)` (тестовая утилита).
  - `PasswordService.hash(plain: string): Promise<string>`, `.verify(hash: string, plain: string): Promise<boolean>`.
  - `AccessTokenService.issue(user: { id: string; role: Role }): Promise<string>` и `.verify(token: string): Promise<{ sub: string; role: Role }>`:
    - истёкший токен → `AppError(TOKEN_EXPIRED, 401)`;
    - подделанный или битый → `AppError(AUTH_UNAUTHENTICATED, 401)`.
  - `RefreshTokenService`:
    - `issue(userId: string, meta: { userAgent?: string; ip?: string }, familyId?: string): Promise<{ token: string; expiresAt: Date }>`;
    - `rotate(token: string, meta): Promise<{ userId: string; token: string; expiresAt: Date }>`;
    - `revokeFamily(token: string): Promise<void>`;
    - `revokeAll(userId: string): Promise<void>`.
    - Если в `rotate` пришёл уже ротированный или отозванный токен, отзывается вся его семья и бросается `AUTH_UNAUTHENTICATED`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(await passwords.verify(await passwords.hash('correct horse'), 'correct horse')).toBe(true);
expect(await passwords.verify(await passwords.hash('correct horse'), 'wrong horse')).toBe(false);
const at = await tokens.issue({ id: 'u1', role: 'USER' });
expect(await tokens.verify(at)).toEqual({ sub: 'u1', role: 'USER' });
clock.advance(15 * 60_000 + 1);  await expect(tokens.verify(at)).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
await expect(tokens.verify(at.slice(0, -2) + 'xx')).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });
// ротация и повтор (Review Focus 1)
const first = await refresh.issue(user.id, {});
const second = await refresh.rotate(first.token, {});
await expect(refresh.rotate(first.token, {})).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });
await expect(refresh.rotate(second.token, {})).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' }); // семья отозвана
expect(await prisma.refreshToken.findFirst({ where: { tokenHash: sha256(first.token) } })).not.toBeNull(); // в БД — хэш
clock.advance(30 * 86_400_000 + 1); // истёкший refresh
```

- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** модули из Interfaces. Секрет берётся из `JWT_SECRET`: в `EnvSchema` это `z.string().min(32)`, с тестом.
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `feat(api): clock, argon2id passwords, access JWT and rotating refresh tokens`.

---

### Task 4: Письма на трёх языках

**Files:**
- Create: `apps/api/src/mail/{mail.module,mail.provider,smtp-mail.provider,mail.service}.ts`, `apps/api/src/mail/templates/{Layout,VerifyEmail,ResetPassword,PhoneCode}.tsx`, `apps/api/src/mail/i18n/{en,lv,ru}.json`, `apps/api/test/support/mailbox.ts` (клиент API Mailpit `http://localhost:8025/api/v1`).
- Test: `apps/api/src/mail/mail.service.test.ts`, `apps/api/test/mail.smtp.test.ts`.

**Interfaces:**
- Produces:
  - `interface MailProvider { send(message: { to: string; subject: string; html: string; text: string }): Promise<void> }`, токен `MAIL_PROVIDER`.
  - `SmtpMailProvider` использует `nodemailer.createTransport(SMTP_URL)` и `from: MAIL_FROM`.
  - `MailService`:
    - `sendVerifyEmail(user: { email; name; locale }, link: string)`;
    - `sendPasswordReset(user, link)`;
    - `sendPhoneCode(user, code: string)`.
  - Шаблоны оформлены в стиле `DESIGN.md`: Sky Wash фон, белая карточка с контуром 1px, чёрная кнопка-пилюля. Тексты берутся из `i18n/{locale}.json`.
  - Ключи переводов у трёх языков совпадают, это проверяет тест, как в плане 1.

- [ ] **Step 1: Write the failing tests**

```ts
// FakeMailProvider (тестовая утилита) собирает письма
await mail.sendVerifyEmail({ email: 'a@b.lv', name: 'Anna', locale: 'lv' }, 'https://yoyo.test/lv/verify-email?token=T');
expect(sent[0].subject).toBe(lv.verifyEmail.subject);
expect(sent[0].html).toContain('https://yoyo.test/lv/verify-email?token=T');
expect(sent[0].text).toContain('https://yoyo.test/lv/verify-email?token=T');
for (const loc of ['lv', 'ru']) expect(flatKeys(i18n[loc])).toEqual(flatKeys(i18n.en));
// mail.smtp.test.ts: SmtpMailProvider → Mailpit; письмо видно через mailbox.latestTo('a@b.lv')
```

- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement.**
  - React Email рендерит HTML и текстовую версию.
  - В CI появляется сервис `axllent/mailpit` (порты 1025 и 8025).
  - Локально Mailpit уже стоит (план 1).
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `feat(api): transactional mail in en/lv/ru via SMTP (Mailpit locally)`.

---

### Task 5: Регистрация и подтверждение почты

**Files:**
- Create: `apps/api/src/auth/{auth.module,auth.controller,auth.service,cookies}.ts`, `packages/shared/src/auth.ts`.
- Test: `apps/api/test/auth.register.e2e.test.ts`.

**Interfaces:**
- Consumes: Task 1–4.
- Produces:
  - `POST /api/v1/auth/register` `{ email, password, name, locale? }`:
    - ответ 201 `{ user: PublicUser }` и cookie `yoyo_at` и `yoyo_rt`;
    - отправляет письмо со ссылкой `${WEB_ORIGIN}${localePrefix}/verify-email?token=…`, где у en префикса нет, у lv это `/lv`, у ru — `/ru`;
    - токен подтверждения живёт 24 часа.
  - `POST /api/v1/auth/verify-email` `{ token }`:
    - успех → 200 `{ user }`;
    - истёк → 410 `TOKEN_EXPIRED`;
    - уже использован → 410 `TOKEN_USED`.
  - `POST /api/v1/auth/resend-verification` (нужен вход) → 202.
  - `PublicUser = { id, email, name, city, about, locale, role, emailVerified: boolean, phoneVerified: boolean, createdAt }` — zod-схема в `@yoyo/shared`, без `passwordHash`.
  - `setAuthCookies(res, tokens)` и `clearAuthCookies(res)` в `cookies.ts` по правилам из Global Constraints.

- [ ] **Step 1: Write the failing tests**

```ts
const res = await request(server).post('/api/v1/auth/register').send({ email: '  Anna@Mail.LV ', password: 'correct horse', name: 'Anna', locale: 'lv' });
expect(res.status).toBe(201); expect(res.body.user).toMatchObject({ email: 'anna@mail.lv', emailVerified: false });
expect(res.headers['set-cookie'].join(';')).toMatch(/yoyo_at=.*HttpOnly.*SameSite=Lax/i);
expect(JSON.stringify(res.body)).not.toContain('passwordHash');
// Review Focus 2
expect((await request(server).post('/api/v1/auth/register').send({ ...anna, email: 'ANNA@mail.lv' })).body.error.code).toBe('AUTH_EMAIL_TAKEN');
expect(await prisma.user.count({ where: { email: 'anna@mail.lv' } })).toBe(1);
expect((await request(server).post('/api/v1/auth/register').send({ ...anna, email: 'b@b.lv', password: 'short' })).body.error.fields.password).toBeDefined();
// ссылка из письма (FakeMailProvider) — одноразовая (Review Focus 4)
const token = tokenFrom(sent.at(-1).text);
expect((await request(server).post('/api/v1/auth/verify-email').send({ token })).status).toBe(200);
expect((await request(server).post('/api/v1/auth/verify-email').send({ token })).body.error.code).toBe('TOKEN_USED');
// истечение: новый пользователь, clock.advance(24h + 1) → 410 TOKEN_EXPIRED
```

- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement.** Ограничение частоты register: 10 запросов в минуту на IP.
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `feat(api): registration with email verification`.

---

### Task 6: Вход, обновление, выход и guard

**Files:**
- Create: `apps/api/src/auth/{auth.guard,current-user.decorator}.ts`, `apps/api/src/me/{me.module,me.controller,me.service}.ts`.
- Modify: `auth.controller.ts`, `auth.service.ts`.
- Test: `apps/api/test/auth.session.e2e.test.ts`.

**Interfaces:**
- Produces:
  - `POST /auth/login` `{ email, password }`:
    - успех → 200 `{ user }` и cookie;
    - неверный пароль или неизвестный email → 401 `AUTH_INVALID_CREDENTIALS` с одинаковым телом. Для неизвестного email всё равно сверяется пустышка-хэш, чтобы не выдавать по времени, есть ли такой пользователь;
    - заблокированный → 403 `AUTH_BLOCKED`.
  - `POST /auth/refresh`: refresh-токен из cookie `yoyo_rt` или из тела `{ refreshToken }`, ротация, новые cookie, а в JSON `{ user, accessToken, refreshToken }` только для запросов с `Authorization` или с телом. Сайту токены в JSON не отдаются.
  - `POST /auth/logout` отзывает текущую семью и очищает cookie; `POST /auth/logout-all` отзывает все сессии.
  - `AuthGuard`:
    - берёт токен из `yoyo_at` или из `Authorization: Bearer`;
    - на **каждый** запрос загружает пользователя: `blockedAt` → 403 `AUTH_BLOCKED`, `deletedAt` → 401;
    - кладёт `request.user: PublicUser`.
  - `@CurrentUser()`; `GET /api/v1/me` → `{ user }`.

- [ ] **Step 1: Write the failing tests**

```ts
// неверный пароль и неизвестный email дают одинаковый ответ
const wrong = await login({ email: anna.email, password: 'nope-nope' });
const unknown = await login({ email: 'ghost@mail.lv', password: 'nope-nope' });
expect([wrong.status, unknown.status]).toEqual([401, 401]); expect(wrong.body).toEqual(unknown.body);
// Review Focus 3: блокировка действует сразу
const agent = request.agent(server); await agent.post('/api/v1/auth/login').send(annaCreds);
await prisma.user.update({ where: { email: anna.email }, data: { blockedAt: new Date() } });
expect((await agent.get('/api/v1/me')).body.error.code).toBe('AUTH_BLOCKED');
// Review Focus 1 через HTTP: старая cookie refresh после ротации убивает обе сессии
// Review Focus 5: 6-я попытка входа за минуту
for (let i = 0; i < 5; i++) await login({ email: anna.email, password: 'nope-nope' });
const limited = await login({ email: anna.email, password: 'nope-nope' });
expect(limited.status).toBe(429); expect(limited.headers['retry-after']).toBeDefined();
// лимит на email: с TRUST_PROXY_HOPS=1 и разными X-Forwarded-For 21-я попытка за час всё равно 429

// Bearer без cookie работает; logout → Set-Cookie с Max-Age=0 для обоих
```

- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `feat(api): login, refresh rotation, logout and auth guard`.

---

### Task 7: Сброс пароля

**Files:**
- Modify: `auth.controller.ts`, `auth.service.ts`.
- Test: `apps/api/test/auth.reset.e2e.test.ts`.

**Interfaces:**
- Produces:
  - `POST /auth/forgot-password` `{ email }`:
    - всегда 202;
    - если email найден, отправляет ссылку `${WEB_ORIGIN}${localePrefix}/reset-password?token=…`, которая живёт 1 час.
  - `POST /auth/reset-password` `{ token, password }`:
    - успех → 200: пароль сменён, все refresh-сессии отозваны;
    - повторное использование токена → 410 `TOKEN_USED`;
    - истёкший токен → 410 `TOKEN_EXPIRED`.

- [ ] **Step 1: Write the failing tests:**
  - неизвестный email → 202 и писем 0;
  - известный email → 202 и 1 письмо;
  - сброс проходит, старый пароль больше не входит, новый входит;
  - старая сессия больше не обновляется;
  - повтор токена → `TOKEN_USED`;
  - `clock.advance(1h+1)` → `TOKEN_EXPIRED`;
  - четвёртый запрос за час → 429.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): password reset by email`.

---

### Task 8: Вход через Google

**Files:**
- Create: `apps/api/src/auth/google-oauth.service.ts`, `apps/api/test/support/fake-google.ts` (локальный HTTP-сервер: authorize, token, JWKS, подписывает id_token тестовым ключом через `jose`).
- Test: `apps/api/test/auth.google.e2e.test.ts`.

**Interfaces:**
- Consumes: env `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (оба опциональны), `GOOGLE_AUTH_URL`, `GOOGLE_TOKEN_URL`, `GOOGLE_JWKS_URL` (по умолчанию адреса Google, в тестах их переопределяют).
- Produces:
  - `GET /auth/providers` → `{ google: boolean }`.
  - `GET /auth/google?returnTo=/path` → 302 на Google с `state` и PKCE (S256). `state` и verifier лежат в короткоживущей подписанной cookie (10 минут).
  - `redirect_uri` = `${WEB_ORIGIN}/api/v1/auth/google/callback`: возврат идёт через прокси сайта (Task 11), поэтому cookie с `state` и cookie сессии остаются первой стороной. Этот же адрес владелец впишет в Google Cloud Console (README, Task 11).
  - `GET /auth/google/callback?code&state` → обмен кода, проверка `id_token` (iss, aud, exp, `email_verified`). Затем одно из трёх:
    - найден `OAuthAccount` → вход;
    - найден пользователь с тем же подтверждённым email → привязка аккаунта;
    - иначе создаётся новый пользователь (`emailVerifiedAt = now`, `passwordHash = null`).
  - После этого ставятся cookie и 302 на `WEB_ORIGIN + returnTo`. `returnTo` принимается только как относительный путь, начинающийся с `/` и не с `//`, иначе `/` (защита от open redirect).
  - Без ключей Google: `/auth/google*` → 404 `AUTH_PROVIDER_DISABLED`, `providers.google = false`.

- [ ] **Step 1: Write the failing tests:**
  - новый пользователь создан и вошёл;
  - существующий email привязан, дубликата нет;
  - неверный `state` → 400;
  - `returnTo=https://evil.example` → редирект на `${WEB_ORIGIN}/`;
  - без env → 404 и `providers.google === false`.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): sign in with Google (PKCE, linked accounts)`.

---

### Task 9: Профиль, смена пароля, удаление, телефон

**Files:**
- Create: `apps/api/src/me/phone.service.ts`, `apps/api/src/sms/{sms.provider,mailbox-sms.provider}.ts`.
- Modify: `me.controller.ts`, `me.service.ts`.
- Test: `apps/api/test/me.e2e.test.ts`.

**Interfaces:**
- Produces:
  - `PATCH /me` `{ name?, city?, about?, locale? }`: name 1–60, city ≤ 60, about ≤ 500, locale ∈ `LOCALES`.
  - `POST /me/password` `{ currentPassword, newPassword }` → 200, другие сессии отозваны.
  - `DELETE /me` `{ password }` → 204. Аккаунт удаляется мягко:
    - `deletedAt = now`;
    - email → `deleted+<id>@yoyo.invalid`, имя → `Deleted user`, `passwordHash = null`;
    - все сессии отозваны, cookie очищены.
  - `interface SmsProvider { send(user, phone, code): Promise<void> }`. `MailboxSmsProvider` отправляет код письмом через `MailService.sendPhoneCode`: это **имитация SMS**, она описана в README.
  - `POST /me/phone` `{ phone }` (E.164) → 202, код из 6 цифр живёт 10 минут; повторно отправить можно не чаще раза в минуту (429).
  - `POST /me/phone/verify` `{ code }`:
    - верный → 200 и `phoneVerifiedAt`;
    - неверный → 400;
    - после 5 неверных попыток → 410 `TOKEN_EXPIRED`, код аннулирован (Review Focus 5).

- [ ] **Step 1: Write the failing tests:**
  - профиль обновляется; невалидные поля → `fields`;
  - смена пароля с неверным текущим паролем → 401;
  - удаление аккаунта: потом вход невозможен, а email можно занять заново;
  - телефон: код из письма (Mailpit/Fake) подтверждает номер;
  - пять неверных кодов → 410.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): profile, password change, account deletion and simulated phone check`.

---

### Task 10: Роли и администратор

**Files:**
- Create: `apps/api/src/auth/roles.guard.ts`, `apps/api/src/admin/{admin.module,admin.controller}.ts`.
- Modify: `apps/api/prisma/seed.ts` (администратор из env).
- Test: `apps/api/test/admin.e2e.test.ts`.

**Interfaces:**
- Produces:
  - `@Roles('ADMIN')` + `RolesGuard`.
  - `GET /api/v1/admin/users?search=&page=` → `{ items: AdminUser[], total }`, по 20 на страницу, поиск по email и имени, `AdminUser = PublicUser & { blockedAt, deletedAt }`. Это основа админ-панели плана 9.
  - `ensureAdmin(prisma, passwords, env): Promise<void>` создаёт или обновляет администратора, если заданы `ADMIN_EMAIL` и `ADMIN_PASSWORD`: роль ADMIN, почта подтверждена. Существующий пароль не перезаписывается.
  - Её вызывают и `runSeed`, и `AdminBootstrap` (`OnApplicationBootstrap` в `AdminModule`) при каждом старте API. В production сид не запускается: контейнер выполняет только `migrate deploy`.

- [ ] **Step 1: Write the failing tests:**
  - обычный пользователь → 403 `AUTH_FORBIDDEN`;
  - без входа → 401;
  - администратор видит список, поиск работает;
  - сид дважды → один администратор;
  - приложение с `ADMIN_EMAIL`/`ADMIN_PASSWORD` поднято дважды → один администратор, он может войти.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): roles, admin user list and admin seed`.

---

### Task 11: Сайт и API через один домен, документация, CI, развёртывание

**Files:**
- Modify:
  - `apps/web/next.config.ts`: `rewrites()` → `{ beforeFiles: [{ source: '/api/:path*', destination: `${resolveApiUrl(...)}/api/:path*` }] }`. Matcher в `src/proxy.ts` уже пропускает `/api` мимо next-intl, его не трогать;
  - `apps/web/src/lib/api.ts`: в браузере база `''` (тот же домен), на сервере — origin API;
  - `apps/web/src/lib/use-api-health.ts`, если нужно;
  - `.github/workflows/ci.yml`: сервис mailpit, env `JWT_SECRET`, `SMTP_URL`;
  - `render.yaml`: env `JWT_SECRET` (`generateValue: true`), `TRUST_PROXY_HOPS: "2"`, `SMTP_URL` и `MAIL_FROM` (`sync: false`), `ADMIN_EMAIL` и `ADMIN_PASSWORD` (`sync: false`), `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` (`sync: false`);
  - `apps/api/.env.example`, `README.md`: раздел «Аккаунты»: cookie, прокси, Gmail SMTP с паролем приложения, имитация SMS, Google OAuth (где взять ключи, redirect URI `https://<сайт>/api/v1/auth/google/callback`). Секреты в Render вписывает владелец;
  - `apps/api/openapi.json` и `packages/api-client/src/schema.d.ts` (перегенерировать).
- Test: `apps/web/e2e/auth-proxy.spec.ts`.

**Interfaces:**
- Consumes: всё выше.
- Produces: сквозной вход через домен сайта. Это доказывает, что cookie работают как cookie первой стороны.

- [ ] **Step 1: Write the failing test**

```ts
// через origin сайта (localhost:3000), API за прокси
const reg = await page.request.post('/api/v1/auth/register', { data: { email: `e2e-${Date.now()}@mail.lv`, password: 'correct horse', name: 'E2E', locale: 'en' } });
expect(reg.status()).toBe(201);
const me = await page.request.get('/api/v1/me');            // cookie, полученная через прокси, работает
expect(me.status()).toBe(200);
expect((await me.json()).user.name).toBe('E2E');
await expect(page.goto('/styleguide')).resolves.toBeTruthy();
await expect(page.getByText(en.apiStatus.online)).toBeVisible(); // health идёт через тот же домен
```

- [ ] **Step 2: Run, verify FAIL** (прокси ещё нет).
- [ ] **Step 3: Implement.** Перегенерировать OpenAPI и клиент; в CI проверка расхождения клиента должна быть зелёной.
- [ ] **Step 4: Run, verify PASS.** `pnpm turbo run lint typecheck test e2e` и `bash scripts/tests/setup-deploy.test.sh`.
- [ ] **Step 5: Commit.** `feat: same-origin API proxy for first-party auth cookies; docs, CI and deploy env`.

---

## Self-Review (выполнено при написании)

- **Покрытие спецификации:**
  - §4.2 (регистрация, подтверждение, восстановление, Google, выход со всех устройств, телефон, настройки, удаление): Task 5–9;
  - §4.7 письма аккаунта на языке получателя: Task 4, 5, 7, 9;
  - §5 «Вход» и «Безопасность» (argon2, ротация, httpOnly, CSRF через SameSite и Origin, rate limit, очистка ввода через zod): Task 1, 3, 6;
  - аватар (загрузка и обрезка) переносится в план 4, где появится хранилище файлов;
  - страницы входа и настроек — в UI-план после плана 2.
- **Согласованность имён:** `AppError`, `ERROR_CODES`, `PublicUser`, `Clock/CLOCK`, `RefreshTokenService.rotate`, `setAuthCookies`, `MailService.send*`, `SmsProvider` одинаковы во всех задачах.
- **Review Focus:** у каждого из пяти пунктов есть тест в своей задаче.
