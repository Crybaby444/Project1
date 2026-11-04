# Yoyo

Маркетплейс аренды вещей между людьми: от PS5 на выходные до дрели на один раз.

- Спецификация: [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](docs/superpowers/specs/2026-11-03-yoyo-design.md)
- Дизайн-система: [`DESIGN.md`](DESIGN.md)
- Планы: [`docs/superpowers/plans/`](docs/superpowers/plans/)

## Структура

| Папка | Что внутри |
|-------|-----------|
| `apps/api` | API на NestJS + Prisma (PostgreSQL), все маршруты под `/api/v1` |
| `apps/web` | Сайт на Next.js |
| `packages/shared` | Общие для сайта и API константы, типы и схемы |

## Локальный запуск

Нужны: Node 24+ (на этом Mac стоит 26), pnpm 12, Homebrew.

1. Установить и запустить базу данных и ловушку для писем:
   ```bash
   brew install postgresql@17 mailpit
   brew services start postgresql@17
   brew services start mailpit
   ```
   PostgreSQL 17 из Homebrew не добавляет свои команды в `PATH`. Чтобы пользоваться `psql` и `createdb` напрямую, добавьте в `~/.zshrc`:
   ```bash
   export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
   ```
2. Создать локальную роль `yoyo` (пароль `yoyo`, только для разработки) и базы для разработки и тестов:
   ```bash
   psql -d postgres -c "CREATE ROLE yoyo LOGIN PASSWORD 'yoyo' CREATEDB;"
   createdb -O yoyo yoyo_dev
   createdb -O yoyo yoyo_test
   ```
   Право `CREATEDB` нужно Prisma: при `migrate dev` она создаёт временную «теневую» базу.
3. Поставить зависимости, создать файл настроек API, применить миграции и заполнить настройки по умолчанию:
   ```bash
   pnpm install
   cp apps/api/.env.example apps/api/.env
   pnpm --filter @yoyo/api db:migrate
   pnpm --filter @yoyo/api db:seed
   ```
   API не запустится без `JWT_SECRET` (не короче 32 символов). В `.env.example` он уже есть. Если `apps/api/.env` создан раньше, допишите строку из `.env.example` или свою, например из `openssl rand -base64 32`.
4. Запустить API:
   ```bash
   pnpm --filter @yoyo/api dev
   ```
   Проверка: <http://localhost:4000/api/v1/health> отвечает `{"status":"ok","db":"up",…}`. Документация API (Swagger, только не в production): <http://localhost:4000/api/docs>.

После изменения API обновите описание и типизированный клиент:

```bash
pnpm --filter @yoyo/api openapi:emit
pnpm --filter @yoyo/api-client generate
```

Письма, которые отправляет сайт при локальной разработке, не уходят наружу. Они видны в Mailpit: <http://localhost:8025>.

## Проверки

```bash
pnpm lint        # линтер
pnpm typecheck   # проверка типов
pnpm test        # тесты (API: база yoyo_test, другую задаёт TEST_DATABASE_URL; письма ловит Mailpit)
pnpm e2e         # сквозные тесты в браузере (сами запускают API и сайт)
```

Те же проверки, плюс сборка Docker-образа API, запускает GitHub Actions на каждый push.

## Развёртывание

Всё бесплатно: база данных в **Neon**, API в Docker на **Render**, сайт на **Vercel**. Сервисы следят за веткой `main` и сами выкатывают каждое изменение.

**Работает сейчас:**

| Что | Адрес |
|-----|-------|
| Сайт | <https://yoyo-rent.vercel.app> (`/lv`, `/ru`) |
| API | <https://yoyo-api.onrender.com/api/v1/health> |

Проект Vercel: `yoyo-rent`. Сервис Render: `yoyo-api` (Blueprint `yoyo`, Frankfurt). База Neon: проект `yoyo` (Frankfurt, Postgres 17).

Первую настройку делает владелец пошаговым мастером:

```bash
./scripts/setup-deploy.sh
```

Мастер открывает нужные страницы, говорит, что нажимать, и сохраняет адреса и строку подключения **только на этом компьютере** в `.env.deploy` (файл в git не попадает).

| Где | Переменная | Значение |
|-----|-----------|----------|
| Render (API) | `DATABASE_URL` | строка подключения Neon (прямая, без pooling) |
| Render (API) | `WEB_ORIGIN` | адрес сайта на Vercel |
| Render (API) | `NODE_ENV` | `production` (задано в `render.yaml`) |
| Render (API) | `JWT_SECRET` | Render генерирует сам (`generateValue` в `render.yaml`), вписывать не нужно |
| Render (API) | `TRUST_PROXY_HOPS` | `2` (задано в `render.yaml`: балансировщик Render и прокси Vercel) |
| Render (API) | `SMTP_URL`, `MAIL_FROM` | необязательно, см. «Аккаунты» → «Почта» |
| Render (API) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | необязательно, см. «Аккаунты» → «Вход через Google» |
| Render (API) | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | необязательно, см. «Аккаунты» → «Администратор» |
| Render (API) | `PORT` | задаёт сам Render |
| Vercel (сайт) | `NEXT_PUBLIC_API_URL` | адрес API на Render, без `/api/v1` |
| Vercel (сайт) | `NEXT_PUBLIC_SHOW_STYLEGUIDE` | `false` |
| Vercel (сайт) | `ENABLE_EXPERIMENTAL_COREPACK` | `1` (Vercel берёт pnpm той же версии, что и проект) |

> Бесплатный сервер Render «засыпает» через 15 минут без запросов и просыпается до минуты. Перед показом откройте адрес API заранее.

Шрифты, домен, почтовый сервис и хостинг меняются через эти настройки и `apps/web/src/styles/fonts.ts`, без переделки кода.

> После слияния ветки с аккаунтами проверьте в Render, что у `yoyo-api` появилась переменная `JWT_SECRET`. Её создаёт синхронизация Blueprint. Если деплой упал с `JWT_SECRET: Invalid input`, нажмите в Blueprint `yoyo` **Manual Sync**, затем **Manual Deploy**. Пока новый деплой не прошёл проверку здоровья, Render держит прежнюю версию.

## Аккаунты

Серверная часть аккаунтов: регистрация, подтверждение почты, вход, выход (в том числе со всех устройств), сброс пароля, вход через Google, профиль, смена пароля, удаление аккаунта, подтверждение телефона и роли. Все маршруты лежат под `/api/v1/auth/*`, `/api/v1/me*` и `/api/v1/admin/*` и описаны в Swagger. Экраны входа и настроек появятся в отдельном плане.

### Сессия и cookie

- После входа API ставит две cookie с флагами `HttpOnly` и `SameSite=Lax`, а в production ещё и `Secure`:
  - `yoyo_at`: access-токен на 15 минут, путь `/`;
  - `yoyo_rt`: refresh-токен на 30 дней, путь `/api/v1/auth`.
- Refresh-токен меняется при каждом обновлении сессии. Если старый токен предъявят ещё раз, отзывается вся цепочка: и укравший, и владелец должны войти заново.
- Блокировка и удаление аккаунта действуют сразу: API проверяет пользователя при каждом запросе.
- Приложения (позже) работают без cookie: `Authorization: Bearer <access>`, а refresh-токен передают в теле `POST /api/v1/auth/refresh`.

### Один домен для сайта и API

Сайт проксирует `/api/*` на API (`apps/web/src/proxy.ts`; заголовки запроса правилом `rewrites` в `next.config.ts` не добавить, а прокси передаёт API секрет `PROXY_SECRET`). Браузер говорит только с адресом сайта, поэтому cookie остаются cookie самого сайта даже на бесплатных адресах `vercel.app` и `onrender.com`.

- Небезопасные запросы с чужим заголовком `Origin` API отклоняет (`403 ORIGIN_FORBIDDEN`).
- Все ответы API помечены `Cache-Control: no-store`, чтобы CDN Vercel их не кэшировал.
- Из-за двух прокси (Vercel и балансировщик Render) в `render.yaml` задано `TRUST_PROXY_HOPS=2`: так ограничения частоты видят настоящий адрес посетителя. При прямом обращении к Render адрес можно подделать. Поэтому ограничения на вход и сброс пароля считаются ещё и по email.

### Почта

- Локально письма ловит Mailpit (<http://localhost:8025>). Это поведение по умолчанию (`SMTP_URL=smtp://localhost:1025`).
- В production без `SMTP_URL` письма не отправляются. В логе появляется строка `mail disabled` с именем шаблона и замаскированным адресом, но без ссылки. Регистрация и сброс пароля при этом работают, письмо можно запросить повторно.
- **Gmail SMTP.**
  1. В аккаунте Google включите двухэтапную проверку.
  2. На <https://myaccount.google.com/apppasswords> создайте пароль приложения.
  3. Впишите в Render `SMTP_URL=smtps://ВАШ_АДРЕС%40gmail.com:ПАРОЛЬ_БЕЗ_ПРОБЕЛОВ@smtp.gmail.com:465`. Символ `@` в адресе записывается как `%40`.
  4. Впишите `MAIL_FROM=Yoyo <ВАШ_АДРЕС@gmail.com>`: Gmail отправляет только от своего адреса.
- **Важно: бесплатный тариф Render закрывает исходящие порты SMTP (25, 465, 587)** с 26.09.2025: [объявление Render](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports). На бесплатном тарифе Gmail SMTP не заработает: письмо упадёт по таймауту через 10 секунд, в логе будет ошибка, сайт продолжит работать. Варианты:
  - платный тариф Render;
  - почтовый сервис с HTTP API за тем же интерфейсом `MailProvider` (`apps/api/src/mail/mail.provider.ts`).

### Телефон

Подтверждение телефона работает только с настоящим SMS-провайдером, чтобы отметка «телефон подтверждён» что-то значила. Такого провайдера пока нет.

- Локально и в тестах `SMS_PROVIDER=mailbox`: код из 6 цифр приходит **письмом** (в Mailpit) и показывает весь сценарий.
- В production `mailbox` запрещён: API с ним не запустится. Без провайдера `POST /api/v1/me/phone*` отвечает `404 AUTH_PROVIDER_DISABLED`, а `GET /api/v1/auth/providers` возвращает `phone: false`.

### Вход через Google

1. Откройте <https://console.cloud.google.com/>, создайте проект и настройте **OAuth consent screen**: тип External, название Yoyo, ваша почта.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**, тип **Web application**.
3. В **Authorized redirect URIs** добавьте адреса:
   - `https://yoyo-rent.vercel.app/api/v1/auth/google/callback` — адрес сайта, а не API: Google возвращает пользователя через прокси сайта;
   - `http://localhost:3000/api/v1/auth/google/callback` — для локальной разработки.
4. Скопируйте **Client ID** и **Client secret** в Render (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) и сохраните. Render перезапустит API.
5. Проверка: `GET https://yoyo-rent.vercel.app/api/v1/auth/providers` возвращает `"google": true`.

Пока ключей нет, вход через Google выключен (`404 AUTH_PROVIDER_DISABLED`), остальное работает.

### Администратор

- Задайте в Render `ADMIN_EMAIL` и `ADMIN_PASSWORD` (не короче 8 символов). При каждом старте API делает этот аккаунт администратором с подтверждённой почтой.
- Если аккаунта нет, API создаёт его с этим паролем. Пароль аккаунта с **подтверждённой** почтой не перезаписывается: после первого входа `ADMIN_PASSWORD` можно удалить.
- Аккаунт с этой почтой, но **без подтверждения**, мог зарегистрировать кто угодно заранее. API забирает его: ставит пароль `ADMIN_PASSWORD`, подтверждает почту и удаляет все его сессии, привязку Google, ссылки и коды (в логе предупреждение с замаскированным адресом).
- Локально то же делает `pnpm --filter @yoyo/api db:seed`.
- Список пользователей для будущей админ-панели: `GET /api/v1/admin/users?search=&page=`.

Секреты (`ADMIN_PASSWORD`, `GOOGLE_CLIENT_SECRET`, пароль внутри `SMTP_URL`) вписывает только владелец, в панели Render. В репозиторий они не попадают.
